# Datasets Directory

This directory contains all normalization practice datasets.

## Adding a New Dataset

1. Copy `template.json` to create a new dataset file
2. Fill in all required fields following the template structure
3. Save the file with a descriptive name (e.g., `library-system.json`)
4. Refresh the application - your dataset will automatically appear!

## Dataset File Structure

Each dataset file must include:
- `id`: Unique identifier
- `title`: Display name
- `difficulty`: "easy", "medium", or "hard"
- `description`: Brief problem description
- `rawData`: Un-normalized data (0NF)
- `solutions`: Solutions for 1NF, 2NF, and 3NF

See `template.json` for a complete example.

## Important Notes

- **File naming**: Use lowercase with hyphens (e.g., `hospital-records.json`)
- **Unique IDs**: Each dataset must have a unique `id` field
- **Complete solutions**: Provide solutions for all three normalization forms (1NF, 2NF, 3NF)
- **Progressive hints**: Include exactly 3 hints per normalization form
- **Valid JSON**: Ensure your JSON file is valid (no syntax errors)

## Example Files

- `flight-charter.json`: Complete example with crew assignments
- `template.json`: Template for creating new datasets

For detailed instructions, see the main README.md in the project root.





