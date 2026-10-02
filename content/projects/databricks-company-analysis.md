After [reading through the PySpark documentation](/blog/pyspark-for-data-engineers),
I wanted to use it on something big enough that pandas alone wouldn't be the
right tool. Databricks Marketplace has a free company dataset from People Data
Labs with nearly **12 million records**, which was ideal.

The whole project runs on **Databricks Free Edition** with serverless compute.

## The dataset

People Data Labs is a B2B data provider. Its *Free Company Dataset* contains
company profiles with a reduced set of fields, covering companies worldwide with
at least one employee in its data. It's updated quarterly.

Installing it from the Marketplace adds it to the Unity Catalog as
`people_data_labs_company_dataset.freedatasets.freecompanydataset`, with these
columns:

| Column | Meaning |
| --- | --- |
| `id` | People Data Labs' id for the company |
| `name` | Company name |
| `founded` | Year founded |
| `website` | A domain associated with the company |
| `size` | Estimated employee-count range |
| `locality` | City, state, country |
| `region` | State, country |
| `country` | Primary country of operation |
| `industry` | Primary industry |
| `linkedin_url` | The company's LinkedIn page |

## The stack

- **Apache Spark / PySpark** to process and transform the data at scale.
- **Spark SQL** to query and analyse it.
- **Pandas** for extra analysis on small results.
- **Databricks notebooks** for the whole workflow.
- **Databricks dashboards** to present what I found.

## Querying it with Spark SQL

The first step is just looking at it:

```python
A = spark.sql("""
    SELECT *
    FROM people_data_labs_company_dataset.freedatasets.freecompanydataset
    LIMIT 5
""")
A.display()
```

That returns a `pyspark.sql.connect.DataFrame` with `country`, `founded`, `id`,
`industry`, `linkedin_url` and the rest of the fields. The first rows already
show a reality of real-world data: **nulls everywhere**. Some companies have no
country, some have no founding year, and some have no industry. Any count or
breakdown has to decide what to do with them.

## Spark for the heavy work, pandas for small results

```python
df = A.toPandas()
```

`toPandas()` pulls the data out of the cluster and into the memory of a single
machine. On five rows that's fine. On 11.7 million rows it would be exactly the
mistake Spark is there to prevent.

So the pattern throughout was:

1. Do the filtering, grouping and aggregation **in Spark**, where it's distributed.
2. Convert only the **small, aggregated result** to pandas for further
   exploration.

## The dashboard

I built a Databricks dashboard, *Data Labs Company Overview*, on top of the
analysis:

| Tile | Result |
| --- | --- |
| Total companies | **11,706,710** |
| Total industries | **149** |
| Top 10 countries by company count | Bar chart (below) |
| Size distribution of companies | Breakdown by employee-count range |

The top 10 countries by number of companies:

| Country | Companies |
| --- | --- |
| United States | 2.59M |
| United Kingdom | 719.91k |
| Australia | 217.8k |
| India | 214.59k |
| Germany | 192.19k |
| Canada | 191.9k |
| Netherlands | 190.77k |
| Spain | 158.63k |
| Brazil | 153k |
| France | 137.37k |

The United States alone accounts for more than the next nine countries combined.

Each tile comes down to a Spark SQL aggregation over the full table. For example,
the country chart is a query like this:

```sql
SELECT country, COUNT(*) AS companies
FROM people_data_labs_company_dataset.freedatasets.freecompanydataset
WHERE country IS NOT NULL
GROUP BY country
ORDER BY companies DESC
LIMIT 10;
```

## What I took away

Working with nearly 12 million records made something concrete that the docs
can only describe. With distributed processing, you stop asking "will this fit
on my laptop?" and start asking "where should this computation happen?" The
answer is almost always "in the cluster, as late as possible before showing it
to a person".

The project moved me from learning concepts to actually applying Spark, SQL,
pandas and data visualisation together on a large dataset.

[Open the notebook](https://lnkd.in/getxtPNN)
