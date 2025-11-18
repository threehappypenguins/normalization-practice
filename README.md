# Database Normalization Practice Application

An interactive web application for learning and practicing database normalization through hands-on exercises.

## Features

- **Sequential Learning**: Progress through normalization forms (1NF → 2NF → 3NF) step by step
- **Visual Table Builder**: Create and modify tables with an intuitive interface
- **Help System**: Progressive hints and solution toggle for learning
- **Validation & Feedback**: Get detailed feedback on your normalization attempts
- **Progress Tracking**: Save your progress and resume where you left off
- **Modular Datasets**: Easy to add new practice problems without code changes

## Getting Started

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser to the URL shown in the terminal (typically `http://localhost:5173`)

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Adding New Datasets

The application uses a modular dataset system. To add a new normalization practice problem:

### Step 1: Create a JSON File

Create a new JSON file in the `src/datasets/` directory. Use the `template.json` file as a reference.

### Step 2: Follow the Dataset Structure

Each dataset file must follow this structure:

```json
{
  "id": "unique-dataset-id",
  "title": "Dataset Title",
  "difficulty": "easy|medium|hard",
  "description": "Brief description of the normalization problem",
  "rawData": {
    "tableName": "RAW_DATA",
    "columns": ["COLUMN1", "COLUMN2", "COLUMN3"],
    "rows": [
      ["value1", "value2", "value3"],
      ["value4", "value5", "value6"]
    ]
  },
  "solutions": {
    "1NF": {
      "explanation": "Explanation of why this is the correct 1NF solution",
      "tables": [
        {
          "name": "TABLE_NAME",
          "columns": [
            {"name": "COLUMN1", "type": "PK"},
            {"name": "COLUMN2", "type": "FK"},
            {"name": "COLUMN3", "type": "attribute"}
          ],
          "sampleRows": [
            ["value1", "value2", "value3"]
          ]
        }
      ],
      "hints": [
        "First hint: General guidance",
        "Second hint: More specific direction",
        "Third hint: Very specific guidance"
      ]
    },
    "2NF": { ... },
    "3NF": { ... }
  }
}
```

### Step 3: Field Descriptions

#### Top-Level Fields

- **id**: Unique identifier (use lowercase with hyphens, e.g., "library-system")
- **title**: Display name for the dataset
- **difficulty**: One of "easy", "medium", or "hard"
- **description**: Brief explanation of what the dataset represents

#### rawData

- **tableName**: Name of the un-normalized table
- **columns**: Array of column names (strings)
- **rows**: Array of arrays, where each inner array represents one row of data

#### solutions

Each normalization form (1NF, 2NF, 3NF) should have:

- **explanation**: Text explaining why this solution is correct
- **tables**: Array of table definitions
- **hints**: Array of 3 progressive hints (from general to specific)

#### Table Definition

Each table in the solution should have:

- **name**: Table name (string)
- **columns**: Array of column objects with:
  - **name**: Column name (string)
  - **type**: One of "PK" (Primary Key), "FK" (Foreign Key), or "attribute"
- **sampleRows**: Optional array of sample data rows (arrays of values)

### Step 4: Column Types

- **PK**: Primary Key - Must be marked as PK in the solution
- **FK**: Foreign Key - Must be marked as FK in the solution
- **attribute**: Regular attribute column

### Step 5: Hints Structure

Provide exactly 3 hints that progress from general to specific:

1. **First hint**: General guidance about what to look for
2. **Second hint**: More specific direction pointing to the issue
3. **Third hint**: Very specific guidance about the solution

### Example: Creating a Library System Dataset

```json
{
  "id": "library-system",
  "title": "Library Management System",
  "difficulty": "medium",
  "description": "Normalize library book checkout records",
  "rawData": {
    "tableName": "CHECKOUTS",
    "columns": ["CHECKOUT_ID", "BOOK_TITLE", "AUTHOR", "STUDENT_ID", "STUDENT_NAME", "CHECKOUT_DATE"],
    "rows": [
      ["C001", "Database Design", "Smith", "S123", "John Doe", "2024-01-15"],
      ["C002", "Database Design", "Smith", "S456", "Jane Smith", "2024-01-16"]
    ]
  },
  "solutions": {
    "1NF": {
      "explanation": "The table is already in 1NF as there are no repeating groups...",
      "tables": [
        {
          "name": "CHECKOUT",
          "columns": [
            {"name": "CHECKOUT_ID", "type": "PK"},
            {"name": "BOOK_TITLE", "type": "attribute"},
            {"name": "AUTHOR", "type": "attribute"},
            {"name": "STUDENT_ID", "type": "attribute"},
            {"name": "STUDENT_NAME", "type": "attribute"},
            {"name": "CHECKOUT_DATE", "type": "attribute"}
          ],
          "sampleRows": [
            ["C001", "Database Design", "Smith", "S123", "John Doe", "2024-01-15"]
          ]
        }
      ],
      "hints": [
        "Check if there are any repeating groups or multi-valued attributes",
        "This table is already in 1NF - no repeating groups exist",
        "Since the table is already in 1NF, you can proceed to 2NF"
      ]
    },
    "2NF": { ... },
    "3NF": { ... }
  }
}
```

### Step 6: Refresh the Application

After creating your dataset file:

1. Save the file in `src/datasets/`
2. Refresh the browser (or restart the dev server if needed)
3. Your new dataset will appear in the dataset selector

## Dataset Best Practices

1. **Use descriptive IDs**: Make IDs clear and related to the problem (e.g., "hospital-records", "student-grades")

2. **Provide realistic data**: Use sample data that makes sense for the domain

3. **Ensure progression**: Each normalization form should build on the previous one:
   - 1NF should eliminate repeating groups
   - 2NF should eliminate partial dependencies
   - 3NF should eliminate transitive dependencies

4. **Write clear explanations**: Help users understand WHY the solution is correct

5. **Progressive hints**: Make hints increasingly specific to guide learning without giving away the answer

6. **Test your dataset**: After creating a dataset, test it in the application to ensure:
   - The solution validates correctly
   - Hints are helpful
   - The progression makes sense

## Technologies Used

- **React**: UI framework
- **Vite**: Build tool and dev server
- **Tailwind CSS**: Styling
- **localStorage**: Progress persistence

## Features in Detail

### Progress Tracking

- Progress is automatically saved to browser localStorage
- Completed normalization forms are marked with checkmarks
- You can resume where you left off after refreshing

### Validation System

The validator checks:
- Correct number of tables
- Correct table names (flexible matching)
- Correct columns in each table
- Correct primary keys
- Correct foreign keys
- No missing attributes

### Help System

- **Hints**: Progressive hints that guide without giving answers
- **Solution Toggle**: View the correct solution while working
- **Explanations**: Understand why the solution is correct

## Troubleshooting

### Dataset Not Appearing

- Ensure the JSON file is valid (check for syntax errors)
- Verify the file is in `src/datasets/` directory
- Check that the `id` field is unique
- Refresh the browser or restart the dev server

### Validation Not Working

- Ensure all required fields are present in your dataset
- Check that column types (PK, FK, attribute) are correct
- Verify table names match (case-insensitive matching is used)

## License

This project is open source and available for educational use.





