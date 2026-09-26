import React, { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import NavBar from '../../components/NavBar';
import PageNav from '../../components/PageNav';
import SelectInput from '../../components/SelectInput';
import useThemeStore from '../../stores/useThemeStore';
import useToastStore from '../../stores/useToastStore';
import productService from '../../services/productService';
import './ProductImport.css';

const UOM_OPTIONS = [
  { value: 'single', label: 'Single Unit', icon: 'fa-cube' },
  { value: 'set', label: 'Set', icon: 'fa-layer-group' },
  { value: 'carton', label: 'Carton', icon: 'fa-box' },
  { value: 'dozen', label: 'Dozen (12)', icon: 'fa-hashtag' },
];

const TAX_TYPE_OPTIONS = [
  { value: 'vat', label: 'VAT', icon: 'fa-percent' },
  { value: 'exempt', label: 'Tax Exempt', icon: 'fa-ban' },
];

const STATUS_OPTIONS = [
  { value: 1, label: 'Active', icon: 'fa-circle-check' },
  { value: 0, label: 'Inactive', icon: 'fa-circle-minus' },
];

const HEADER_ALIASES = {
  category: 'category_name',
  'category name': 'category_name',
  category_name: 'category_name',
  'category id': 'category_id',
  category_id: 'category_id',
  name: 'name',
  product: 'name',
  'product name': 'name',
  product_name: 'name',
  sku: 'sku',
  'product sku': 'sku',
  description: 'description',
  'unit price': 'unit_price',
  price: 'unit_price',
  unit_price: 'unit_price',
  'unit of measure': 'unit_of_measure',
  unit: 'unit_of_measure',
  uom: 'unit_of_measure',
  unit_of_measure: 'unit_of_measure',
  'tax type': 'tax_type',
  tax: 'tax_type',
  tax_type: 'tax_type',
  'tax rate': 'tax_rate',
  'tax rate (%)': 'tax_rate',
  tax_rate: 'tax_rate',
  'stock quantity': 'stock_quantity',
  stock: 'stock_quantity',
  quantity: 'stock_quantity',
  stock_quantity: 'stock_quantity',
  'reorder level': 'reorder_level',
  reorder: 'reorder_level',
  reorder_level: 'reorder_level',
  status: 'is_active',
  active: 'is_active',
  is_active: 'is_active',
};

const CATEGORY_HEADER_ALIASES = {
  'category id': 'category_id',
  category_id: 'category_id',
  id: 'category_id',
  'category name': 'name',
  category: 'name',
  name: 'name',
  description: 'description',
  'description (optional)': 'description',
  'category description': 'description',
};

const normaliseHeader = (header) => String(header || '')
  .trim()
  .toLowerCase()
  .replace(/[\-]+/g, ' ')
  .replace(/\s+/g, ' ');

const normaliseUnit = (value) => {
  const raw = String(value ?? '').trim().toLowerCase();
  if (['single', 'single unit', 'unit', 'piece', 'pcs', 'pc'].includes(raw)) return 'single';
  if (['set', 'sets'].includes(raw)) return 'set';
  if (['carton', 'cartons', 'ctn'].includes(raw)) return 'carton';
  if (['dozen', 'dozen (12)', '12'].includes(raw)) return 'dozen';
  return raw;
};

const normaliseTaxType = (value) => {
  const raw = String(value ?? '').trim().toLowerCase();
  if (!raw) return 'vat';
  if (raw.includes('exempt') || raw === 'none' || raw === 'no tax') return 'exempt';
  if (raw.includes('vat')) return 'vat';
  return raw;
};

const normaliseStatus = (value) => {
  if (value === 1 || value === true) return 1;
  if (value === 0 || value === false) return 0;
  const raw = String(value ?? '').trim().toLowerCase();
  if (!raw) return 1;
  if (['active', 'yes', 'true', '1', 'y'].includes(raw)) return 1;
  if (['inactive', 'no', 'false', '0', 'n'].includes(raw)) return 0;
  return value;
};

const isRowEmpty = (row) => Object.values(row).every((value) => String(value ?? '').trim() === '');

const buildImportRows = (rawRows) => rawRows
  .map((rawRow, index) => {
    const mapped = {};

    Object.entries(rawRow).forEach(([header, value]) => {
      const field = HEADER_ALIASES[normaliseHeader(header)];
      if (field) mapped[field] = value;
    });

    if (isRowEmpty(mapped)) return null;

    const taxType = normaliseTaxType(mapped.tax_type);
    return {
      row_number: index + 2,
      category_id: mapped.category_id ?? '',
      category_name: String(mapped.category_name ?? '').trim(),
      name: String(mapped.name ?? '').trim(),
      sku: String(mapped.sku ?? '').trim().toUpperCase(),
      description: String(mapped.description ?? '').trim(),
      unit_price: mapped.unit_price ?? '',
      unit_of_measure: normaliseUnit(mapped.unit_of_measure),
      tax_type: taxType,
      tax_rate: mapped.tax_rate === '' || mapped.tax_rate === undefined
        ? (taxType === 'exempt' ? 0 : 7.5)
        : mapped.tax_rate,
      stock_quantity: mapped.stock_quantity === '' || mapped.stock_quantity === undefined ? 0 : mapped.stock_quantity,
      reorder_level: mapped.reorder_level === '' || mapped.reorder_level === undefined ? 0 : mapped.reorder_level,
      is_active: normaliseStatus(mapped.is_active),
    };
  })
  .filter(Boolean);

const buildImportCategories = (rawRows) => rawRows
  .map((rawRow, index) => {
    const mapped = {};

    Object.entries(rawRow).forEach(([header, value]) => {
      const field = CATEGORY_HEADER_ALIASES[normaliseHeader(header)];
      if (field) mapped[field] = value;
    });

    const categoryId = String(mapped.category_id ?? '').trim();
    const name = String(mapped.name ?? '').trim();
    const description = String(mapped.description ?? '').trim();

    if (!categoryId && !name && !description) return null;

    return {
      row_number: index + 2,
      category_id: categoryId,
      name,
      description,
    };
  })
  .filter(Boolean);

const TEMPLATE_HEADERS = [
  'Category',
  'Product Name',
  'SKU',
  'Description',
  'Unit Price',
  'Unit of Measure',
  'Tax Type',
  'Tax Rate (%)',
  'Stock Quantity',
  'Reorder Level',
  'Status',
];

const TEMPLATE_COLUMN_WIDTHS = [
  { wch: 24 }, { wch: 30 }, { wch: 20 }, { wch: 38 }, { wch: 16 },
  { wch: 20 }, { wch: 16 }, { wch: 16 }, { wch: 18 }, { wch: 16 }, { wch: 14 },
];

const REQUIRED_TEMPLATE_COLUMNS = [
  { fields: ['category_name', 'category_id'], label: 'Category' },
  { fields: ['name'], label: 'Product Name' },
  { fields: ['sku'], label: 'SKU' },
  { fields: ['unit_price'], label: 'Unit Price' },
  { fields: ['unit_of_measure'], label: 'Unit of Measure' },
];

const missingRequiredColumns = (headers = []) => {
  const mappedFields = new Set(
    headers
      .map((header) => HEADER_ALIASES[normaliseHeader(header)])
      .filter(Boolean)
  );

  return REQUIRED_TEMPLATE_COLUMNS
    .filter(({ fields }) => !fields.some((field) => mappedFields.has(field)))
    .map(({ label }) => label);
};

const fetchAllProductCategories = async () => {
  const categories = [];
  let page = 1;
  let totalPages = 1;

  do {
    const response = await productService.getCategories({
      page,
      limit: 500,
      sortBy: 'name',
      sortOrder: 'ASC',
    });

    categories.push(...(response.data?.data || []));
    totalPages = Math.max(1, Number(response.data?.meta?.total_pages) || 1);
    page += 1;
  } while (page <= totalPages);

  return categories;
};

const errorFor = (row, field) => row.errors?.find((error) => error.field === field)?.message || '';

const ProductImport = () => {
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const { theme } = useThemeStore();
  const { showToast } = useToastStore();

  const [nav, setNav] = useState(false);
  const [file, setFile] = useState(null);
  const [rows, setRows] = useState([]);
  const [categoryRows, setCategoryRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [options, setOptions] = useState({ categories: [] });
  const [dragging, setDragging] = useState(false);
  const [reading, setReading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [dirty, setDirty] = useState(false);

  React.useEffect(() => {
    document.title = 'Otelex | Import Products';
  }, []);

  const categoryOptions = useMemo(
    () => (options.categories || []).map((category) => ({
      value: category.name,
      label: category.is_new ? `${category.name} (New)` : category.name,
      icon: category.is_new ? 'fa-circle-plus' : 'fa-tag',
    })),
    [options.categories]
  );

  const currentSummary = useMemo(() => {
    if (!rows.length) return { total: 0, valid: 0, invalid: 0, pending: 0 };
    const valid = rows.filter((row) => row.valid === true).length;
    const invalid = rows.filter((row) => row.valid === false).length;
    return {
      total: rows.length,
      valid,
      invalid,
      pending: rows.length - valid - invalid,
    };
  }, [rows]);

  const categoryPreview = useMemo(() => ({
    newCategories: categoryRows.filter((row) => row?.valid === true && row?.is_new === true),
    invalidCategories: categoryRows.filter((row) => row?.valid === false),
  }), [categoryRows]);

  const applyPreview = (preview) => {
    setRows(preview.rows || []);
    setCategoryRows(preview.categories?.rows || categoryRows);
    setSummary(preview.summary || null);
    setOptions(preview.options || { categories: [] });
    setDirty(false);
  };

  const validateRows = async (rowsToValidate = rows, { silent = false, categoriesToValidate = categoryRows } = {}) => {
    if (!rowsToValidate.length) return null;

    setValidating(true);
    try {
      const response = await productService.previewProductImport({
        rows: rowsToValidate.map((row) => row.data || row),
        categories: categoriesToValidate.map((row) => row.data || row),
      });
      const preview = response.data.data;
      applyPreview(preview);
      if (!silent) {
        showToast(
          response.data.message || 'Product rows validated.',
          preview.summary?.can_import ? 'success' : 'warning'
        );
      }
      return preview;
    } catch (error) {
      showToast(error.response?.data?.message || 'Could not validate the product import.', 'error');
      return null;
    } finally {
      setValidating(false);
    }
  };

  const readWorkbook = async (selectedFile) => {
    const extension = selectedFile.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls'].includes(extension)) {
      showToast('Please select a valid Excel file (.xlsx or .xls).', 'error');
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      showToast('The Excel file cannot exceed 10 MB.', 'error');
      return;
    }

    setReading(true);
    try {
      const XLSX = await import('xlsx');
      const buffer = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      if (!firstSheet) throw new Error('The workbook does not contain a readable worksheet.');

      const worksheetRows = XLSX.utils.sheet_to_json(firstSheet, {
        header: 1,
        defval: '',
        raw: true,
        blankrows: false,
      });
      const missingColumns = missingRequiredColumns(worksheetRows[0] || []);
      if (missingColumns.length) {
        throw new Error(`Missing required column${missingColumns.length === 1 ? '' : 's'}: ${missingColumns.join(', ')}. Please use the product import template.`);
      }

      const rawRows = XLSX.utils.sheet_to_json(firstSheet, { defval: '', raw: true });
      const parsedRows = buildImportRows(rawRows);

      const categorySheetName = workbook.SheetNames.find((sheetName) => sheetName.trim().toLowerCase() === 'categories');
      const categorySheet = categorySheetName ? workbook.Sheets[categorySheetName] : null;
      const parsedCategories = categorySheet
        ? buildImportCategories(XLSX.utils.sheet_to_json(categorySheet, { defval: '', raw: true }))
        : [];

      if (!parsedRows.length) {
        throw new Error('No product rows were found in the first worksheet.');
      }
      if (parsedRows.length > 1000) {
        throw new Error('A maximum of 1,000 products can be imported at once.');
      }

      setFile(selectedFile);
      setCategoryRows(parsedCategories);
      const preview = await validateRows(parsedRows, { silent: true, categoriesToValidate: parsedCategories });
      if (preview) {
        showToast(
          `${preview.summary.total} product row(s) loaded for review${preview.summary.can_import ? '.' : '; some rows need attention.'}`,
          preview.summary.can_import ? 'success' : 'warning'
        );
      } else {
        setFile(null);
      }
    } catch (error) {
      showToast(error.message || 'Could not read the Excel workbook.', 'error');
      setFile(null);
      setRows([]);
      setCategoryRows([]);
      setSummary(null);
    } finally {
      setReading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleFile = (selectedFile) => {
    if (!selectedFile || reading || validating || importing) return;
    readWorkbook(selectedFile);
  };

  const updateRow = (index, field, value) => {
    setRows((current) => current.map((row, rowIndex) => {
      if (rowIndex !== index) return row;

      const data = { ...(row.data || row), [field]: value };

      if (field === 'category_name') {
        data.category_name = value;
        data.category_id = '';
      }

      if (field === 'tax_type') {
        data.tax_rate = value === 'exempt' ? 0 : (Number(data.tax_rate) > 0 ? data.tax_rate : 7.5);
      }

      const remainingErrors = (row.errors || []).filter((error) => error.field !== field);
      if (field === 'category_name') {
        const withoutCategory = remainingErrors.filter((error) => !['category_id', 'category_name'].includes(error.field));
        return { ...row, data, valid: null, errors: withoutCategory };
      }

      return { ...row, data, valid: null, errors: remainingErrors };
    }));
    setDirty(true);
    setSummary(null);
  };

  const removeRow = (index) => {
    setRows((current) => current.filter((_, rowIndex) => rowIndex !== index));
    setDirty(true);
    setSummary(null);
  };

  const resetImport = () => {
    setFile(null);
    setRows([]);
    setCategoryRows([]);
    setSummary(null);
    setOptions({ categories: [] });
    setDirty(false);
    setDragging(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const downloadTemplate = async () => {
    if (downloadingTemplate) return;

    setDownloadingTemplate(true);
    try {
      const [XLSX, categories] = await Promise.all([
        import('xlsx'),
        fetchAllProductCategories(),
      ]);

      const workbook = XLSX.utils.book_new();

      const productSheet = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS]);
      productSheet['!cols'] = TEMPLATE_COLUMN_WIDTHS;
      XLSX.utils.book_append_sheet(workbook, productSheet, 'Products');

      const instructions = [
        ['Otelex Product Import Template'],
        ['Important', 'Enter products on the Products sheet. Do not rename the column headers.'],
        ['Categories Sheet', 'Existing categories are listed for reference. To add a new category, add a row at the bottom, leave Category ID blank, enter the Category Name, and optionally add a Description. New categories are created only when you submit the product import.'],
        ['Existing Categories', 'Do not change the Category ID or rename an existing category in this workbook. Use the Categories page if an existing category needs to be edited.'],
        ['Category', 'Required. Use a category name exactly as shown on the Categories sheet, including any new category you add there.'],
        ['Product Name', 'Required. Maximum 200 characters.'],
        ['SKU', 'Required and must be unique. Existing SKUs cannot be imported again. Format numeric-looking SKUs as Text in Excel to preserve leading zeroes.'],
        ['Description', 'Optional.'],
        ['Unit Price', 'Required. Use a number greater than or equal to 0.'],
        ['Unit of Measure', 'Required. Allowed values: Single, Set, Carton, Dozen.'],
        ['Tax Type', 'Use VAT or Exempt. Defaults to VAT when blank.'],
        ['Tax Rate (%)', 'Use 7.5 for standard VAT. Tax-exempt products are saved as 0.'],
        ['Stock Quantity', 'Optional. Defaults to 0 and cannot be negative.'],
        ['Reorder Level', 'Optional. Defaults to 0 and cannot be negative.'],
        ['Status', 'Use Active or Inactive. Defaults to Active when blank.'],
        ['Import Limit', 'A maximum of 1,000 products can be imported at once.'],
      ];
      const instructionSheet = XLSX.utils.aoa_to_sheet(instructions);
      instructionSheet['!cols'] = [{ wch: 24 }, { wch: 86 }];
      XLSX.utils.book_append_sheet(workbook, instructionSheet, 'Instructions');

      const categoryTemplateRows = [
        ['Category ID', 'Category Name', 'Description (Optional)'],
        ...categories.map((category) => [category.id, category.name, category.description || '']),
      ];
      const categorySheet = XLSX.utils.aoa_to_sheet(categoryTemplateRows);
      categorySheet['!cols'] = [{ wch: 14 }, { wch: 34 }, { wch: 46 }];
      XLSX.utils.book_append_sheet(workbook, categorySheet, 'Categories');

      XLSX.writeFile(workbook, 'Otelex_Product_Import_Template.xlsx');
      showToast('Product import template downloaded.', 'success');
    } catch (error) {
      showToast(error.response?.data?.message || 'Could not download the product import template.', 'error');
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const handleImport = async () => {
    if (!rows.length || dirty || !summary?.can_import) return;

    setImporting(true);
    try {
      const response = await productService.importProducts({
        rows: rows.map((row) => row.data),
        categories: categoryRows.map((row) => row.data || row),
      });
      showToast(response.data.message || 'Products imported successfully.', 'success');
      navigate('/products');
    } catch (error) {
      const validationData = error.response?.data?.data;
      if (validationData?.rows) {
        applyPreview(validationData);
      }
      showToast(error.response?.data?.message || 'Could not import products.', 'error');
    } finally {
      setImporting(false);
    }
  };

  const busy = reading || validating || importing;
  const canImport = rows.length > 0 && !dirty && summary?.can_import && !busy;

  return (
    <div className={`main-container theme-${theme}`}>
      <Header setNav={setNav} nav={nav} />
      <NavBar setNav={setNav} nav={nav} />

      <div className="page-content">
        <PageNav
          pageTitle="Import Products"
          links={[
            { label: 'Dashboard', to: '/' },
            { label: 'Products', to: '/products' },
            { label: 'Import Products', active: true },
          ]}
        />

        <div className="pi-wrapper">
          {!rows.length ? (
            <section className={`pi-upload-card theme-${theme}`}>
              <div className="pi-upload-heading">
                <div className="pi-upload-icon"><i className="fas fa-file-excel" /></div>
                <div className="pi-upload-heading-copy">
                  <h3>Upload Product Excel File</h3>
                  <p>Upload the completed product template. Nothing is saved until you review and submit the preview.</p>
                </div>
                <button
                  type="button"
                  className="pi-template-btn"
                  onClick={downloadTemplate}
                  disabled={busy || downloadingTemplate}
                >
                  {downloadingTemplate
                    ? <><span className="pi-spinner small" /> Preparing Template...</>
                    : <><i className="fas fa-file-arrow-down" /> Download Template</>}
                </button>
              </div>

              <div
                className={`pi-dropzone ${dragging ? 'is-dragging' : ''} ${busy ? 'is-disabled' : ''}`}
                onDragEnter={(event) => { event.preventDefault(); if (!busy) setDragging(true); }}
                onDragOver={(event) => event.preventDefault()}
                onDragLeave={(event) => {
                  event.preventDefault();
                  if (event.currentTarget === event.target) setDragging(false);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragging(false);
                  handleFile(event.dataTransfer.files?.[0]);
                }}
                onClick={() => !busy && fileRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if ((event.key === 'Enter' || event.key === ' ') && !busy) fileRef.current?.click();
                }}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                  onChange={(event) => handleFile(event.target.files?.[0])}
                  hidden
                />
                <div className="pi-drop-icon"><i className="fas fa-cloud-arrow-up" /></div>
                {reading || validating ? (
                  <>
                    <h4>Reading and validating workbook...</h4>
                    <p>Please wait while the product rows are prepared for review.</p>
                    <span className="pi-spinner" />
                  </>
                ) : (
                  <>
                    <h4>Drop your Excel file here</h4>
                    <p>or click to browse from your computer</p>
                    <button type="button" className="pi-browse-btn">Choose Excel File</button>
                    <span className="pi-file-note">.xlsx or .xls • Maximum 10 MB • Up to 1,000 products</span>
                  </>
                )}
              </div>

              <div className="pi-help-grid">
                <div className="pi-help-item">
                  <i className="fas fa-tags" />
                  <div><strong>Categories sheet</strong><span>Add new categories there with a blank Category ID, then use their names on the Products sheet.</span></div>
                </div>
                <div className="pi-help-item">
                  <i className="fas fa-pen-to-square" />
                  <div><strong>Review before saving</strong><span>Every imported value can be checked and corrected before submission.</span></div>
                </div>
                <div className="pi-help-item">
                  <i className="fas fa-shield-check" />
                  <div><strong>Validated safely</strong><span>Categories, SKUs and product values are verified against the database first.</span></div>
                </div>
              </div>
            </section>
          ) : (
            <>
              <section className="pi-summary-grid">
                <div className={`pi-summary-card theme-${theme}`}>
                  <span className="pi-summary-icon total"><i className="fas fa-table-list" /></span>
                  <div><span>Total Rows</span><strong>{currentSummary.total}</strong></div>
                </div>
                <div className={`pi-summary-card theme-${theme}`}>
                  <span className="pi-summary-icon valid"><i className="fas fa-circle-check" /></span>
                  <div><span>Valid</span><strong>{currentSummary.valid}</strong></div>
                </div>
                <div className={`pi-summary-card theme-${theme}`}>
                  <span className="pi-summary-icon invalid"><i className="fas fa-circle-exclamation" /></span>
                  <div><span>Needs Attention</span><strong>{currentSummary.invalid}</strong></div>
                </div>
                <div className={`pi-summary-card theme-${theme}`}>
                  <span className="pi-summary-icon pending"><i className="fas fa-pen" /></span>
                  <div><span>Changed / Pending</span><strong>{currentSummary.pending}</strong></div>
                </div>
              </section>

              <section className={`pi-preview-card theme-${theme}`}>
                <div className="pi-preview-toolbar">
                  <div className="pi-file-info">
                    <span className="pi-file-icon"><i className="fas fa-file-excel" /></span>
                    <div>
                      <strong>{file?.name}</strong>
                      <span>{file ? `${(file.size / 1024).toFixed(1)} KB` : 'Excel workbook'} • Review each row before importing</span>
                    </div>
                  </div>

                  <div className="pi-toolbar-actions">
                    <button type="button" className="pi-btn neutral" onClick={downloadTemplate} disabled={busy || downloadingTemplate}>
                      {downloadingTemplate
                        ? <><span className="pi-spinner small" /> Preparing...</>
                        : <><i className="fas fa-file-arrow-down" /> Template</>}
                    </button>
                    <button type="button" className="pi-btn neutral" onClick={resetImport} disabled={busy}>
                      <i className="fas fa-arrow-rotate-left" /> Choose Another File
                    </button>
                    <button type="button" className="pi-btn validate" onClick={() => validateRows()} disabled={busy || !rows.length}>
                      {validating ? <><span className="pi-spinner small" /> Validating...</> : <><i className="fas fa-shield-check" /> Validate Changes</>}
                    </button>
                    <button type="button" className="pi-btn primary" onClick={handleImport} disabled={!canImport}>
                      {importing ? <><span className="pi-spinner small" /> Importing...</> : <><i className="fas fa-file-import" /> Import {rows.length} Product{rows.length === 1 ? '' : 's'}</>}
                    </button>
                  </div>
                </div>

                {(dirty || currentSummary.invalid > 0 || Number(summary?.invalid_categories || 0) > 0) && (
                  <div className={`pi-validation-banner ${(currentSummary.invalid > 0 || Number(summary?.invalid_categories || 0) > 0) ? 'warning' : 'info'}`}>
                    <i className={`fas ${(currentSummary.invalid > 0 || Number(summary?.invalid_categories || 0) > 0) ? 'fa-triangle-exclamation' : 'fa-circle-info'}`} />
                    <span>
                      {dirty
                        ? 'Some product rows have been edited or removed. Validate the changes before importing.'
                        : `${currentSummary.invalid} product row${currentSummary.invalid === 1 ? '' : 's'} and ${Number(summary?.invalid_categories || 0)} category row${Number(summary?.invalid_categories || 0) === 1 ? '' : 's'} need attention.`}
                    </span>
                  </div>
                )}

                {!dirty && summary?.can_import && (
                  <div className="pi-validation-banner success">
                    <i className="fas fa-circle-check" />
                    <span>
                      All {summary.total} product rows are valid and ready to import.
                      {Number(summary.new_categories || 0) > 0
                        ? ` ${summary.new_categories} new categor${summary.new_categories === 1 ? 'y' : 'ies'} will be created first.`
                        : ''}
                    </span>
                  </div>
                )}

                {(categoryPreview.newCategories.length > 0 || categoryPreview.invalidCategories.length > 0) && (
                  <div className="pi-category-preview">
                    <div className="pi-category-preview-heading">
                      <div className="pi-category-preview-title">
                        <span className="pi-category-preview-icon"><i className="fas fa-tags" /></span>
                        <div>
                          <strong>Categories from workbook</strong>
                          <span>New categories are created in the same transaction before the products are saved.</span>
                        </div>
                      </div>
                      <div className="pi-category-preview-counts">
                        {categoryPreview.newCategories.length > 0 && (
                          <span className="new"><i className="fas fa-circle-plus" /> {categoryPreview.newCategories.length} New</span>
                        )}
                        {categoryPreview.invalidCategories.length > 0 && (
                          <span className="invalid"><i className="fas fa-triangle-exclamation" /> {categoryPreview.invalidCategories.length} Fix</span>
                        )}
                      </div>
                    </div>

                    <div className="pi-category-preview-grid">
                      {categoryPreview.newCategories.map((categoryRow, index) => {
                        const category = categoryRow.data || categoryRow;
                        return (
                          <div className="pi-category-item is-new" key={`new-category-${category.row_number || index}-${category.name}`}>
                            <span className="pi-category-item-icon"><i className="fas fa-circle-plus" /></span>
                            <div>
                              <strong>{category.name}</strong>
                              <span>{category.description || 'No description provided'}</span>
                            </div>
                            <small>Will be created</small>
                          </div>
                        );
                      })}

                      {categoryPreview.invalidCategories.map((categoryRow, index) => {
                        const category = categoryRow.data || categoryRow;
                        const issue = categoryRow.errors?.[0]?.message || 'Review this category row in the workbook.';
                        return (
                          <div className="pi-category-item has-error" key={`invalid-category-${categoryRow.row_number || index}-${category?.name || index}`}>
                            <span className="pi-category-item-icon"><i className="fas fa-triangle-exclamation" /></span>
                            <div>
                              <strong>{category?.name || `Categories row ${categoryRow.row_number || index + 2}`}</strong>
                              <span>{issue}</span>
                            </div>
                            <small>Row {categoryRow.row_number || index + 2}</small>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="pi-products-review">
                  {rows.map((row, index) => {
                    const data = row.data || row;
                    const categoryError = errorFor(row, 'category_id') || errorFor(row, 'category_name');
                    return (
                      <article
                        key={`${row.row_number || index}-${index}`}
                        className={`pi-product-card ${row.valid === false ? 'has-errors' : ''}`}
                      >
                        <div className="pi-product-card-header">
                          <div className="pi-product-card-title">
                            <span className="pi-row-number"><span>{row.row_number || index + 2}</span></span>
                            <div>
                              <strong>Product {index + 1}</strong>
                              <span>Excel row {row.row_number || index + 2}</span>
                            </div>
                          </div>
                        </div>

                        <div className="pi-product-row pi-product-row-primary">
                          <div className="pi-field pi-field-status">
                            <label>Validation Status</label>
                            <div className="pi-status-field">
                              {row.valid === true ? (
                                <span className="pi-row-status valid"><i className="fas fa-circle-check" /> Valid</span>
                              ) : row.valid === false ? (
                                <span className="pi-row-status invalid"><i className="fas fa-circle-exclamation" /> Fix</span>
                              ) : (
                                <span className="pi-row-status pending"><i className="fas fa-pen" /> Changed</span>
                              )}
                            </div>
                          </div>

                          <div className="pi-field">
                            <label>Category</label>
                            <SelectInput
                              options={categoryOptions}
                              value={data.category_name}
                              onChange={(value) => updateRow(index, 'category_name', value)}
                              placeholder="Select category"
                              searchable
                              size="sm"
                              error={categoryError}
                              disabled={busy}
                              className="pi-select"
                            />
                          </div>

                          <div className="pi-field">
                            <label>Product Name</label>
                            <input
                              className={`pi-cell-input ${errorFor(row, 'name') ? 'has-error' : ''}`}
                              value={data.name ?? ''}
                              onChange={(event) => updateRow(index, 'name', event.target.value)}
                              disabled={busy}
                            />
                            {errorFor(row, 'name') && <span className="pi-cell-error">{errorFor(row, 'name')}</span>}
                          </div>

                          <div className="pi-field">
                            <label>SKU</label>
                            <input
                              className={`pi-cell-input pi-sku-input ${errorFor(row, 'sku') ? 'has-error' : ''}`}
                              value={data.sku ?? ''}
                              onChange={(event) => updateRow(index, 'sku', event.target.value.toUpperCase())}
                              disabled={busy}
                            />
                            {errorFor(row, 'sku') && <span className="pi-cell-error">{errorFor(row, 'sku')}</span>}
                          </div>
                        </div>

                        <div className="pi-product-row pi-product-row-secondary">
                          <div className="pi-field pi-field-description">
                            <label>Description</label>
                            <textarea
                              className="pi-cell-input pi-cell-textarea"
                              value={data.description ?? ''}
                              onChange={(event) => updateRow(index, 'description', event.target.value)}
                              rows={4}
                              disabled={busy}
                            />
                          </div>
                        </div>

                        <div className="pi-product-row pi-product-row-tertiary">
                          <div className="pi-field">
                            <label>Unit Price (₦)</label>
                            <input
                              className={`pi-cell-input ${errorFor(row, 'unit_price') ? 'has-error' : ''}`}
                              type="number"
                              min="0"
                              step="0.01"
                              value={data.unit_price ?? ''}
                              onChange={(event) => updateRow(index, 'unit_price', event.target.value)}
                              disabled={busy}
                            />
                            {errorFor(row, 'unit_price') && <span className="pi-cell-error">{errorFor(row, 'unit_price')}</span>}
                          </div>

                          <div className="pi-field">
                            <label>Unit</label>
                            <SelectInput
                              options={UOM_OPTIONS}
                              value={data.unit_of_measure}
                              onChange={(value) => updateRow(index, 'unit_of_measure', value)}
                              size="sm"
                              error={errorFor(row, 'unit_of_measure')}
                              disabled={busy}
                              className="pi-select"
                            />
                          </div>

                          <div className="pi-field">
                            <label>VAT / Tax Type</label>
                            <SelectInput
                              options={TAX_TYPE_OPTIONS}
                              value={data.tax_type}
                              onChange={(value) => updateRow(index, 'tax_type', value)}
                              size="sm"
                              error={errorFor(row, 'tax_type')}
                              disabled={busy}
                              className="pi-select"
                            />
                          </div>

                          <div className="pi-field">
                            <label>Tax Rate (%)</label>
                            <input
                              className={`pi-cell-input ${errorFor(row, 'tax_rate') ? 'has-error' : ''}`}
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={data.tax_type === 'exempt' ? 0 : (data.tax_rate ?? '')}
                              onChange={(event) => updateRow(index, 'tax_rate', event.target.value)}
                              disabled={busy || data.tax_type === 'exempt'}
                            />
                            {errorFor(row, 'tax_rate') && <span className="pi-cell-error">{errorFor(row, 'tax_rate')}</span>}
                          </div>
                        </div>

                        <div className="pi-product-row pi-product-row-quaternary">
                          <div className="pi-field">
                            <label>Stock Qty</label>
                            <input
                              className={`pi-cell-input ${errorFor(row, 'stock_quantity') ? 'has-error' : ''}`}
                              type="number"
                              min="0"
                              step="1"
                              value={data.stock_quantity ?? 0}
                              onChange={(event) => updateRow(index, 'stock_quantity', event.target.value)}
                              disabled={busy}
                            />
                            {errorFor(row, 'stock_quantity') && <span className="pi-cell-error">{errorFor(row, 'stock_quantity')}</span>}
                          </div>

                          <div className="pi-field">
                            <label>Reorder Level</label>
                            <input
                              className={`pi-cell-input ${errorFor(row, 'reorder_level') ? 'has-error' : ''}`}
                              type="number"
                              min="0"
                              step="1"
                              value={data.reorder_level ?? 0}
                              onChange={(event) => updateRow(index, 'reorder_level', event.target.value)}
                              disabled={busy}
                            />
                            {errorFor(row, 'reorder_level') && <span className="pi-cell-error">{errorFor(row, 'reorder_level')}</span>}
                          </div>

                          <div className="pi-field">
                            <label>Product Status</label>
                            <SelectInput
                              options={STATUS_OPTIONS}
                              value={data.is_active}
                              onChange={(value) => updateRow(index, 'is_active', value)}
                              size="sm"
                              error={errorFor(row, 'is_active')}
                              disabled={busy}
                              className="pi-select"
                            />
                          </div>

                          <div className="pi-field pi-field-action">
                            <label>Action</label>
                            <button
                              type="button"
                              className="pi-remove-row-btn"
                              onClick={() => removeRow(index)}
                              disabled={busy}
                            >
                              <i className="fas fa-trash" /> Remove Row
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>

                <div className="pi-footer-actions">
                  <div className="pi-footer-note">
                    <i className="fas fa-circle-info" />
                    <span>Removing a row only removes it from this import preview. Existing products are not affected.</span>
                  </div>
                  <div className="pi-toolbar-actions">
                    <button type="button" className="pi-btn neutral" onClick={() => navigate('/products')} disabled={busy}>Cancel</button>
                    <button type="button" className="pi-btn validate" onClick={() => validateRows()} disabled={busy || !rows.length}>
                      <i className="fas fa-shield-check" /> Validate Changes
                    </button>
                    <button type="button" className="pi-btn primary" onClick={handleImport} disabled={!canImport}>
                      <i className="fas fa-file-import" /> Import Products
                    </button>
                  </div>
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductImport;
