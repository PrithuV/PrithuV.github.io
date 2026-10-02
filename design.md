# Portfolio

This is a portfolio website and guide how to build.

### Components: 
- Yaml files for each section that I can edit directly to CRUD content myself without going into code. 
- Actual Design in React, NextJS.
  - Libraries to use -> Tailwind, Shadcn, Radix UI, whatever seems useful.
- Design code and files should be seperate from YAML files. It must read content from YAML Files, do not hardcode anything in the code.


### Design:
- Main Inspiration: Notion's UI. The Notion Page, Minimal, base colors, and clean, and in a straight linear 
scroll
- Must have parallax effect
- No unnecessary background elements. Keep it very minimal, exactly like Notion. 

    #### THEME
    - Light theme and dark theme. Light by Default
    - Font:
      -  Instrument Sans - variable
      -  Colors: Exactly like notion
  


### Sections - all the info in this must be taken from yaml files. Keep the template as code and content from yaml
- Main hero section with my name and title
- Education
- Projects
  - Projects must be a full width tile with thumbnail, title, description, skills used as tags, then button for read more, code, demo
- Skills
- Contact
  - Email
  - Phone Number
  - should have buttons for socials only if the content is present in the YAML, else hide the button
    - Github
    - Linkedin
    - Huggingface
    - Hashnode
    - Youtube
    - Google Scholar
    - Open Review
    - Instagram
    - Spotify