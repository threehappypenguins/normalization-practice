import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATASETS_DIR = path.join(__dirname, '..', 'src', 'datasets');
const FORMS = ['1NF', '2NF', '3NF'];

const normalize = (value) => {
  if (!value || typeof value !== 'string') return '';
  return value.trim().toLowerCase().replace(/\s+/g, '_');
};

const addRef = (map, key, ref) => {
  if (!key || !ref) return;
  const normalizedKey = normalize(key);
  if (!normalizedKey) return;
  if (!map.has(normalizedKey)) {
    map.set(normalizedKey, new Set());
  }
  map.get(normalizedKey).add(ref);
};

const buildFormMeta = (tables, prevMeta) => {
  const tableMap = {};
  const columnsByName = new Map();
  const columnsByToken = new Map();

  const collectTokensFromSource = (source) => {
    const tokens = new Set();
    if (!source) return tokens;
    tokens.add(normalize(source));
    if (source.includes('.')) {
      const [tableName, columnName] = source.split('.', 2);
      tokens.add(normalize(columnName));
      const prevColumn = prevMeta?.tables?.[tableName]?.columns?.[columnName];
      if (prevColumn) {
        prevColumn.tokens.forEach((token) => tokens.add(token));
      }
    } else {
      tokens.add(normalize(source));
    }
    return tokens;
  };

  for (const table of tables || []) {
    const tableMeta = { columns: {} };
    tableMap[table.name] = tableMeta;

    for (const column of table.columns || []) {
      const tokens = new Set();
      tokens.add(normalize(column.name));

      (column.sourceCols || []).forEach((source) => {
        const sourceTokens = collectTokensFromSource(source);
        sourceTokens.forEach((token) => tokens.add(token));
      });

      const columnMeta = { tokens };
      tableMeta.columns[column.name] = columnMeta;

      const ref = `${table.name}.${column.name}`;
      addRef(columnsByName, column.name, ref);
      tokens.forEach((token) => addRef(columnsByToken, token, ref));
    }
  }

  const finalizeMap = (map) => {
    const result = new Map();
    map.forEach((set, key) => {
      result.set(key, Array.from(set));
    });
    return result;
  };

  return {
    tables: tableMap,
    columnsByName: finalizeMap(columnsByName),
    columnsByToken: finalizeMap(columnsByToken)
  };
};

const findRefsByName = (meta, name) => {
  if (!meta) return [];
  return meta.columnsByName.get(normalize(name)) || [];
};

const findRefsByToken = (meta, token) => {
  if (!meta) return [];
  return meta.columnsByToken.get(normalize(token)) || [];
};

const updateColumnSources = (column, prevMeta) => {
  if (!prevMeta) return false;
  const original = Array.isArray(column.sourceCols) ? [...column.sourceCols] : [];

  const refsByName = findRefsByName(prevMeta, column.name);
  if (refsByName.length > 0) {
    const newSources = Array.from(new Set(refsByName));
    column.sourceCols = newSources;
    return JSON.stringify(newSources) !== JSON.stringify(original);
  }

  const newSources = [];
  const seen = new Set();
  let replaced = false;

  const pushSource = (value) => {
    if (!value) return;
    if (!seen.has(value)) {
      seen.add(value);
      newSources.push(value);
    }
  };

  const sources = original.length > 0 ? original : [column.name];

  sources.forEach((source) => {
    if (!source) return;
    if (source.includes('.')) {
      pushSource(source);
      return;
    }
    const matches = findRefsByToken(prevMeta, source);
    if (matches.length > 0) {
      replaced = true;
      matches.forEach((match) => pushSource(match));
    } else {
      pushSource(source);
    }
  });

  if (replaced) {
    column.sourceCols = newSources;
    return JSON.stringify(newSources) !== JSON.stringify(original);
  }

  return false;
};

const normalizeMappingType = (column) => {
  if (!column || !column.mappingType) return false;
  const type = column.mappingType.toLowerCase();
  if (type !== 'consolidate' && type !== 'metadata') {
    return false;
  }

  const hasPreviousFormSource = (column.sourceCols || []).some((source) => source.includes('.'));
  if (hasPreviousFormSource) {
    column.mappingType = 'direct';
    return true;
  }

  return false;
};

const transformDataset = (dataset) => {
  let changed = false;
  let prevMeta = null;

  FORMS.forEach((form, index) => {
    const formData = dataset.solutions?.[form];
    if (!formData || !Array.isArray(formData.tables)) {
      return;
    }

    if (index > 0 && prevMeta) {
      formData.tables.forEach((table) => {
        (table.columns || []).forEach((column) => {
          const updatedSources = updateColumnSources(column, prevMeta);
          const normalizedMapping = normalizeMappingType(column);
          if (updatedSources || normalizedMapping) {
            changed = true;
          }
        });
      });
    }

    prevMeta = buildFormMeta(formData.tables, prevMeta);
  });

  return changed;
};

const run = () => {
  const files = fs.readdirSync(DATASETS_DIR).filter((file) => file.endsWith('.json'));
  let totalChanged = 0;

  files.forEach((file) => {
    const filePath = path.join(DATASETS_DIR, file);
    const original = fs.readFileSync(filePath, 'utf8');
    const dataset = JSON.parse(original);

    const changed = transformDataset(dataset);
    if (changed) {
      fs.writeFileSync(filePath, JSON.stringify(dataset, null, 2) + '\n');
      totalChanged += 1;
      console.log(`Updated ${file}`);
    }
  });

  console.log(`\nTransformation complete. Updated ${totalChanged} file(s).`);
};

run();
