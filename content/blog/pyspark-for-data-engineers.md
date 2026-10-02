*The 17-page summary this post is based on is [here as a PDF](/documents/pyspark-doc-summary.pdf).*

I started learning PySpark mainly to understand the Databricks ecosystem and how
it all fits together. The problem: I couldn't find many up-to-date resources
that covered what I needed *from a data engineering perspective*.

So I did the most logical thing and read the entire documentation. Then I pulled
out the parts that actually matter for data engineering and wrote them up.

The goal was a guide that's less "here are 47 things PySpark can do" and more
"here are the things you'll actually need as a data engineer". Hopefully it saves
someone a few hours of reading docs.

## Why Spark DataFrames

A DataFrame is a two-dimensional, labelled table whose columns can have different
types, like a spreadsheet or a SQL table. Spark's version adds what matters at scale:

- **Distributed computing:** data is split across the nodes of a cluster and
  processed in parallel.
- **In-memory processing:** computation stays in memory where possible, which is
  much faster than going to disk.
- **Schema flexibility:** schemas can evolve over time.
- **Fault tolerance:** DataFrames are built on RDDs (Resilient Distributed
  Datasets). If a node dies, Spark recomputes the lost pieces.

## Creating a DataFrame

There are four ways you'll actually use.

```python
# 1. From a list of dictionaries
employees = [
    {"name": "John D.", "age": 30},
    {"name": "Alice G.", "age": 25},
    {"name": "Bob T.", "age": 35},
    {"name": "Eve A.", "age": 28},
]
df = spark.createDataFrame(employees)
df.show()

# 2. From a local file
df = spark.read.csv("../data/employees.csv", header=True, inferSchema=True)
df = spark.read.option("multiline", "true").json("../data/employees.json")

# 3. From an existing DataFrame
new_df = df.select("name", "age")

# 4. From a table in a database or catalog
df = spark.read.table("my_catalog.my_schema.employees")
```

## Looking at the data

`df.show()` prints the DataFrame and takes three optional arguments:

- `n` is how many rows to show (the default is 20).
- `truncate` is how many characters of each value to show (the default is 20).
- `vertical=True` prints one line per value, which helps with wide tables.

```python
df.show(5, truncate=False)
df.show(vertical=True)
```

## DataFrames vs tables

A **DataFrame** is an immutable, distributed collection that only exists in the
current Spark session. A **table** is persistent and can be used across sessions.

```python
df.createOrReplaceTempView("employees")         # visible in this SparkSession only
df.createGlobalTempView("employees_global")     # visible to other sessions in the same app
spark.sql("SELECT * FROM employees WHERE age > 28").show()
```

To keep data beyond the application, write it to **persistent storage** (cloud
storage, a distributed file system, or disk) so it outlives the cluster.

## Data types worth knowing

| Type | Use it for |
| --- | --- |
| `ByteType` | Integers from -128 to 127 |
| `ShortType` | Integers from -32,768 to 32,767 |
| `IntegerType` | Counts, indices, discrete quantities (32-bit) |
| `LongType` | Large integers (64-bit) |
| `FloatType` | Speed over precision |
| `DoubleType` | Most numeric work; a good balance of precision and speed |
| `DecimalType` | Fixed precision and scale, for money and anything accurate to the cent |
| `StringType` | Text (Unicode) |
| `BinaryType` | Raw bytes such as file contents or images |
| `DateType` | Calendar dates (`datetime.date`) |
| `TimestampType` | Date plus time (`datetime.datetime`), e.g. log timestamps |

The rule of thumb for decimals: use **Float** for large volumes where small
errors don't matter, **Double** for general calculations, and **Decimal** for
financial reporting, where rounding errors aren't acceptable.

### Complex and semi-structured types

- **`ArrayType`** stores many values of the same type in one column
  (`['apple', 'banana', 'cherry']`). Good for tags and categories.
- **`StructType`** nests columns inside a column, for hierarchical records.
- **`MapType`** stores key-value pairs, like a Python dict.
- **JSON** is handled with `from_json()` (string to structured column) and
  `to_json()` (column back to a JSON string).
- **XML** can be read into DataFrames the same way.
- **`VARIANT`** stores semi-structured data such as JSON without a fixed schema
  upfront. It replaces the old habit of storing JSON as a plain string. It's
  flexible, but test performance, and make sure everything downstream supports it.

## Cleaning data

```python
from pyspark.sql.functions import col, lower

df = df.withColumnRenamed("name", "full_name")   # rename
df = df.na.drop()                                # or df.dropna(): drop rows with NULL / NaN
df = df.na.fill({"age": 0})                      # or df.fillna(): fill what's left
df = df.distinct()                               # remove duplicate rows
df = df.withColumn("full_name", lower(col("full_name")))
df = df.select("full_name", "age")               # reorder or keep columns
```

## Transforming data

Transformation is the main part of any data engineering job.

```python
from pyspark.sql import functions as F

# Keep only what you need. Input tables can have billions of rows.
adults = df.where(F.col("age") >= 30)            # .filter() is the same thing

# Reshape: one row per element of an array column
tags = df.select("id", F.explode("tags").alias("tag"))

# Summarise
summary = (
    df.groupBy("department")
      .agg(F.count("*").alias("headcount"),
           F.avg("salary").alias("avg_salary"))
)
```

`explode()` deserves a note: it turns one row holding an array of *n* items into
*n* rows. That's often what makes the data easy to aggregate.

### Joins

```python
joined = employees.join(departments, on="dept_id", how="left")
```

There are seven join types: `inner` (the default), `left`, `right`, `full`,
`cross`, `left_semi` and `left_anti`. The last two are underrated:

- `left_semi` means "rows that have a match", without bringing in the other
  table's columns.
- `left_anti` means "rows with no match". It's ideal for finding orphaned records.

## SQL or the DataFrame API

Both run on the same engine, so choose by readability:

```python
spark.sql("SELECT department, COUNT(*) AS n FROM employees GROUP BY department")

df.groupBy("department").count()
```

- The **SQL API** suits people coming from SQL.
- The **DataFrame API** reads like Python. It's more flexible for complex logic
  and works naturally with UDFs.

## Reading and writing files

```python
csv_df     = spark.read.csv("../data/employees.csv", header=True, inferSchema=True)
json_df    = spark.read.option("multiline", "true").json("../data/employees.json")
parquet_df = spark.read.parquet("../data/employees.parquet")
orc_df     = spark.read.orc("../data/employees.orc")

csv_df.write.csv("../data/employees_out.csv", mode="overwrite", header=True)
parquet_df.write.parquet("../data/employees_out.parquet", mode="overwrite")
json_df.write.orc("../data/employees_out.orc", mode="overwrite")
```

- `header=True` treats the first line as column names (on read) and writes them (on write).
- `inferSchema=True` guesses column types. It's convenient, but it needs an extra pass over the data.
- `mode="overwrite"` replaces the output directory if it exists.
- **Parquet** and **ORC** are columnar and compressed. Parquet is the usual
  default, and ORC is common in Hadoop environments.

## ANSI mode

ANSI mode makes Spark behave like standard SQL. Instead of quietly returning
odd values, invalid operations **throw errors**. Turn it on when you want
data-quality problems to fail loudly instead of becoming silent NULLs.

| Behaviour | ANSI off | ANSI on |
| --- | --- | --- |
| `1 == '1'` | True (implicit cast) | False, like pandas |
| `'a'` cast to int | Quietly becomes NULL | Raises an error |
| Mixed-type operations | Implicitly coerced | Disallowed, raise errors |

The operations most affected are decimal-float arithmetic (`/`, `//`, `*`, `%`)
and boolean-vs-None logic (`|`, `&`, `^`).

The settings that control it:

- **`spark.sql.ansi.enabled`** is the main switch for both SQL and the pandas
  API on Spark. If it's off, the two settings below have no effect.
- **`compute.ansi_mode_support`** (pandas API on Spark) says whether ANSI mode is
  fully supported. It defaults to True.
- **`compute.fail_on_ansi_mode`** (pandas API on Spark) controls whether to fail
  immediately under ANSI mode when support is off. Set it to False to force the
  old behaviour.

## What I'd tell myself on day one

1. Learn `select`, `where`, `groupBy().agg()` and `join` first. Most pipelines
   are combinations of those four.
2. Use Parquet unless you have a reason not to.
3. Use `DecimalType` for money.
4. Use temp views for SQL inside a session, and persistent tables to share
   across sessions.
5. Turn on ANSI mode when correctness matters more than the job finishing.

I put all of this into practice in a follow-up project: [analysing 12 million
companies with PySpark on Databricks](/projects/databricks-company-analysis).
