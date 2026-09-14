import { useLiveQuery } from 'dexie-react-hooks';
import { db, isStockManaged, type Product, type Category, type PriceTier } from '@/lib/db';
import { sanitizeTiers, hasTiers, parseTiersFromSheet } from '@/lib/price-tiers';
import { useState, useRef } from 'react';
import { Plus, Search, Edit2, Trash2, Package as PackageIcon, Camera, X, Copy, Infinity as InfinityIcon, ScanLine, Upload, Download, AlertTriangle, CheckCircle2, XCircle, Loader2, FileSpreadsheet, MoreVertical, Mic } from '@/components/icons';
import { Button } from '@/components/jokoui/button';
import { Input } from '@/components/jokoui/input';
import { Label } from '@/components/jokoui/label';
import { Switch } from '@/components/jokoui/switch';
import { Textarea } from '@/components/jokoui/textarea';
import { PageHeader } from '@/components/jokoui/page-header';
import HubTabs from '@/components/layout/HubTabs';
import { EmptyState } from '@/components/jokoui/empty-state';
import { StatCard } from '@/components/jokoui/stat-card';
import { Item, ItemMedia, ItemContent, ItemTitle, ItemDescription, ItemActions, ItemGroup } from '@/components/jokoui/item';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Alert, AlertTitle } from '@/components/jokoui/alert';
import { Badge } from '@/components/jokoui/badge';
import { cn } from '@/lib/utils';
import { compressImage } from '@/lib/image-utils';
import { trackEvent } from '@/lib/analytics';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import BarcodeScanner from '@/components/BarcodeScanner';
import ScanProductsDialog from '@/components/products/ScanProductsDialog';
import SpeechProductsDialog from '@/components/products/SpeechProductsDialog';
import { useTranslation } from 'react-i18next';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/jokoui/table';
import { downloadOrShareFile } from '@/lib/file-utils';

const CURRENCY_SYMBOL: Record<string, string> = { id: 'Rp', en: 'Rp', ms: 'Rp' };
const NUMBER_LOCALES: Record<string, string> = { id: 'id-ID', en: 'en-US', ms: 'ms-MY' };

interface ParsedRow {
  rowNum: number;
  name: string;
  sku: string;
  categoryName: string;
  price: number;
  hpp: number;
  trackStock: boolean;
  stock: number;
  unit: string;
  barcode?: string;
  description?: string;
  priceTiers: PriceTier[];
  isValid: boolean;
  errors: string[];
}

export default function Produk() {
  const { currentUser, can } = useAuth();
  const canManage = can('manage_products');
  const { t, i18n } = useTranslation('products');
  const numberLocale = NUMBER_LOCALES[i18n.language] ?? 'id-ID';
  const currencySymbol = CURRENCY_SYMBOL[i18n.language] ?? 'Rp';

  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  // Field tujuan hasil scan kamera: SKU atau Barcode.
  const [scanTarget, setScanTarget] = useState<'sku' | 'barcode' | null>(null);

  // Excel Import States
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [scanDialogOpen, setScanDialogOpen] = useState(false);
  const [speechDialogOpen, setSpeechDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [importRows, setImportRows] = useState<ParsedRow[]>([]);
  const [hasMoreThan100, setHasMoreThan100] = useState(false);
  const importFileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [price, setPrice] = useState('');
  const [hpp, setHpp] = useState('');
  const [priceTiers, setPriceTiers] = useState<PriceTier[]>([]);
  /** Saringan cepat dari kartu ringkasan: semua / menipis / habis. */
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');
  const [stock, setStock] = useState('');
  const [trackStock, setTrackStock] = useState(true);
  const [unit, setUnit] = useState('pcs');
  const [barcode, setBarcode] = useState('');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState<string | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const products = useLiveQuery(() => db.products.where('isDeleted').equals(0).toArray());
  const categories = useLiveQuery(() => db.categories.where('isDeleted').equals(0).toArray());
  const units = useLiveQuery(() => db.units.where('isDeleted').equals(0).toArray());

  // Compose dropdown options: active master units + current product's unit if it has been deleted/renamed
  const unitOptions = (() => {
    const names = (units ?? []).map(u => u.name);
    if (unit && !names.includes(unit)) names.push(unit);
    return names;
  })();

  /**
   * "Menipis" memakai ambang 5 — sama dengan yang dipakai peringatan di Beranda,
   * supaya angka di dua layar tidak pernah bertentangan.
   */
  const LOW_STOCK_THRESHOLD = 5;
  const managed = (products ?? []).filter(isStockManaged);
  const lowStockProducts = managed.filter(p => p.stock > 0 && p.stock <= LOW_STOCK_THRESHOLD);
  const outOfStockProducts = managed.filter(p => p.stock <= 0);

  const filtered = products?.filter(p => {
    const q = search.toLowerCase();
    const matchSearch =
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      (p.description?.toLowerCase().includes(q) ?? false);
    const matchCategory = filterCategory === 'all' || p.categoryId === Number(filterCategory);
    const matchStock =
      stockFilter === 'all' ||
      (isStockManaged(p) && (stockFilter === 'low'
        ? p.stock > 0 && p.stock <= LOW_STOCK_THRESHOLD
        : p.stock <= 0));
    return matchSearch && matchCategory && matchStock;
  }) ?? [];

  const getCategoryName = (catId: number) => categories?.find(c => c.id === catId)?.name ?? '-';

  const rp = (n: number) => `${currencySymbol} ${n.toLocaleString(numberLocale)}`;

  const openAdd = () => {
    if (!categories || categories.length === 0) {
      toast.error(t('toast.noCategory'));
      return;
    }
    setEditProduct(null);
    setName(''); setSku(''); setCategoryId(categories[0]?.id?.toString() ?? ''); setPrice(''); setHpp(''); setStock(''); setTrackStock(true); setUnit('pcs'); setBarcode(''); setDescription(''); setPhoto(undefined);
    setDialogOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditProduct(p);
    setName(p.name); setSku(p.sku); setCategoryId(p.categoryId.toString()); setPrice(p.price.toString()); setHpp(p.hpp.toString()); setPriceTiers(p.priceTiers ?? []); setStock(p.stock.toString()); setTrackStock(isStockManaged(p)); setUnit(p.unit); setBarcode(p.barcode ?? ''); setDescription(p.description ?? ''); setPhoto(p.photo);
    setDialogOpen(true);
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error(t('toast.invalidImage'));
      return;
    }
    try {
      const compressed = await compressImage(file);
      setPhoto(compressed);
    } catch {
      toast.error(t('toast.processImageFailed'));
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = async () => {
    if (!name.trim() || !categoryId || !sku.trim()) return;

    // Check SKU uniqueness
    const existing = await db.products
      .where('sku')
      .equals(sku.trim())
      .filter(p => p.isDeleted === 0)
      .first();
    if (existing && existing.id !== editProduct?.id) {
      toast.error(t('toast.skuExists', { sku: sku.trim(), name: existing.name }));
      return;
    }

    const data = {
      name: name.trim(),
      sku: sku.trim(),
      categoryId: Number(categoryId),
      price: Number(price) || 0,
      priceTiers: sanitizeTiers(priceTiers),
      hpp: Number(hpp) || 0,
      stock: Number(stock) || 0,
      trackStock,
      unit: unit.trim() || 'pcs',
      description: description.trim() || undefined,
      barcode: barcode.trim() || undefined,
      photo: photo || undefined,
      updatedAt: new Date(),
      updatedBy: currentUser?.id,
    };

    if (editProduct?.id) {
      await db.products.update(editProduct.id, data);
      trackEvent('edit_product');
    } else {
      await db.products.add({
        ...data,
        createdAt: new Date(),
        createdBy: currentUser?.id,
        isDeleted: 0,
        deletedAt: null,
      } as Product);
      trackEvent('create_product');
    }
    setDialogOpen(false);
  };

  const handleDelete = async () => {
    if (deleteId) {
      await db.products.update(deleteId, {
        isDeleted: 1,
        deletedAt: new Date(),
        updatedBy: currentUser?.id,
      });
      setDeleteId(null);
    }
  };

  const downloadTemplate = async () => {
    try {
      const ExcelJSModule = await import('exceljs');
      const ExcelJS = (ExcelJSModule as unknown as { default?: typeof ExcelJSModule }).default ?? ExcelJSModule;
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Template Produk');

      // Setup headers
      worksheet.columns = [
        { header: 'Nama Produk *', key: 'name', width: 25 },
        { header: 'SKU *', key: 'sku', width: 15 },
        { header: 'Kategori *', key: 'category', width: 18 },
        { header: 'Harga Jual *', key: 'price', width: 15 },
        { header: 'HPP', key: 'hpp', width: 15 },
        { header: 'Kelola Stok (Ya/Tidak)', key: 'trackStock', width: 22 },
        { header: 'Stok Awal', key: 'stock', width: 15 },
        { header: 'Satuan *', key: 'unit', width: 12 },
        { header: 'Barcode', key: 'barcode', width: 15 },
        { header: 'Deskripsi', key: 'description', width: 30 },
        { header: 'Harga Bertingkat', key: 'priceTiers', width: 32 }
      ];

      // Style header row
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF4F46E5' } // Indigo-600
        };
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      });
      headerRow.height = 24;

      // Add a couple of examples
      worksheet.addRow({
        name: 'Kopi Susu Gula Aren',
        sku: 'KOPI-001',
        category: 'Minuman',
        price: 15000,
        hpp: 8000,
        trackStock: 'Ya',
        stock: 50,
        unit: 'pcs',
        barcode: '8991234567890',
        description: 'Kopi susu segar dengan gula aren murni',
        // Format satu sel: Nama:minQty:harga, dipisah titik koma.
        priceTiers: 'Grosir:12:13000; Partai:50:11500'
      });

      worksheet.addRow({
        name: 'Nasi Goreng Spesial',
        sku: 'NASGOR-001',
        category: 'Makanan',
        price: 22000,
        hpp: 10000,
        trackStock: 'Tidak',
        stock: 0,
        unit: 'porsi',
        barcode: '',
        description: 'Nasi goreng dengan topping telur dadar dan ayam suwir',
        priceTiers: ''
      });

      // Add a secondary sheet for referencing active categories and units
      const refSheet = workbook.addWorksheet('Daftar Referensi');
      refSheet.columns = [
        { header: 'Kategori yang Tersedia', key: 'categories', width: 25 },
        { header: '', width: 5 },
        { header: 'Satuan yang Tersedia', key: 'units', width: 25 }
      ];

      const refHeaderRow = refSheet.getRow(1);
      refHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      refHeaderRow.getCell(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0284C7' } // Sky-600
      };
      refHeaderRow.getCell(3).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0D9488' } // Teal-600
      };

      const cats = categories || [];
      const unts = units || [];
      const maxRows = Math.max(cats.length, unts.length);

      for (let i = 0; i < maxRows; i++) {
        refSheet.addRow([
          cats[i] ? cats[i].name : '',
          '',
          unts[i] ? unts[i].name : ''
        ]);
      }

      // Write to file
      const buffer = await workbook.xlsx.writeBuffer();
      await downloadOrShareFile(buffer as ArrayBuffer, {
        fileName: 'Template_Import_Produk.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: 'Simpan / Bagikan Template',
        shareTitle: 'Template Import Produk',
      });
      toast.success('Template berhasil diunduh!');
    } catch (err) {
      console.error(err);
      toast.error('Gagal mengunduh template');
    }
  };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    setIsValidating(true);
    setHasMoreThan100(false);
    setImportRows([]);

    try {
      const ExcelJSModule = await import('exceljs');
      const ExcelJS = (ExcelJSModule as unknown as { default?: typeof ExcelJSModule }).default ?? ExcelJSModule;
      const workbook = new ExcelJS.Workbook();
      const reader = new FileReader();

      reader.onload = async (evt) => {
        try {
          const buffer = evt.target?.result as ArrayBuffer;
          await workbook.xlsx.load(buffer);

          const worksheet = workbook.worksheets[0];
          if (!worksheet) {
            toast.error('File Excel kosong atau tidak valid.');
            setIsValidating(false);
            return;
          }

          const tempRows: ParsedRow[] = [];
          const skuInFile = new Set<string>();

          // Get active db categories & units for validation
          const activeCats = categories || [];
          const activeUnts = units || [];

          // Get existing products in DB (including isDeleted: 1)
          const allDbProducts = await db.products.toArray();
          const dbSkus = new Set(allDbProducts.map(p => p.sku.toLowerCase().trim()));
          const dbProductsBySku = new Map(allDbProducts.map(p => [p.sku.toLowerCase().trim(), p.name]));

          let rowCount = 0;
          worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return; // skip header row

            // Check if row has any values to prevent processing empty rows
            let hasValue = false;
            row.eachCell((cell) => {
              if (cell.value !== null && cell.value !== undefined && cell.value !== '') {
                hasValue = true;
              }
            });
            if (!hasValue) return;

            rowCount++;
            if (rowCount > 100) {
              setHasMoreThan100(true);
              return; // ignore rows after 100
            }

            // Extract values
            const getVal = (col: number): string => {
              const cell = row.getCell(col);
              if (cell.value && typeof cell.value === 'object') {
                if ('richText' in cell.value) {
                  return cell.value.richText.map(t => t.text).join('').trim();
                }
                if ('result' in cell.value) {
                  return String(cell.value.result ?? '').trim();
                }
                if ('text' in cell.value) {
                  return String(cell.value.text ?? '').trim();
                }
                return '';
              }
              return cell.value !== undefined && cell.value !== null ? String(cell.value).trim() : '';
            };

            const name = getVal(1);
            const sku = getVal(2);
            const categoryName = getVal(3);
            const priceStr = getVal(4);
            const hppStr = getVal(5);
            const trackStockStr = getVal(6);
            const stockStr = getVal(7);
            const unit = getVal(8);
            const barcode = getVal(9) || undefined;
            const description = getVal(10) || undefined;
            const priceTiersRaw = getVal(11);

            const errors: string[] = [];

            // Validation
            if (!name) {
              errors.push(t('excel.errorNameRequired'));
            }
            if (!sku) {
              errors.push(t('excel.errorSkuRequired'));
            } else {
              const skuLower = sku.toLowerCase().trim();
              if (skuInFile.has(skuLower)) {
                errors.push(t('excel.errorSkuDupExcel'));
              } else {
                skuInFile.add(skuLower);
              }
              if (dbSkus.has(skuLower)) {
                const existingName = dbProductsBySku.get(skuLower);
                errors.push(t('excel.errorSkuDupDb') + ` ("${existingName}")`);
              }
            }

            // Check Category Name (case-insensitive)
            const matchedCat = activeCats.find(c => c.name.toLowerCase().trim() === categoryName.toLowerCase().trim());
            if (!categoryName) {
              errors.push(t('excel.errorCatNotFound'));
            } else if (!matchedCat) {
              errors.push(t('excel.errorCatNotFound') + `: "${categoryName}"`);
            }

            // Check Unit Name (case-insensitive)
            const matchedUnit = activeUnts.find(u => u.name.toLowerCase().trim() === unit.toLowerCase().trim());
            if (!unit) {
              errors.push(t('excel.errorUnitNotFound'));
            } else if (!matchedUnit) {
              errors.push(t('excel.errorUnitNotFound') + `: "${unit}"`);
            }

            // Parse numbers (handling Rp, spaces, commas, dots)
            const cleanNumber = (val: string): number => {
              if (!val) return 0;
              let clean = val.replace(/Rp/gi, '').replace(/\s+/g, '');
              const lastDot = clean.lastIndexOf('.');
              const lastComma = clean.lastIndexOf(',');
              if (lastDot > lastComma) {
                clean = clean.replace(/,/g, '');
              } else if (lastComma > lastDot) {
                clean = clean.replace(/\./g, '').replace(/,/g, '.');
              } else {
                const match = clean.match(/[.,](\d+)$/);
                if (match) {
                  const decimals = match[1];
                  if (decimals.length === 3) {
                    clean = clean.replace(/[.,]/g, '');
                  } else {
                    clean = clean.replace(/[.,]/g, '.');
                  }
                }
              }
              const parsed = Number(clean);
              return isNaN(parsed) ? -1 : parsed;
            };

            const price = cleanNumber(priceStr);
            const hpp = hppStr ? cleanNumber(hppStr) : 0;
            const stock = stockStr ? cleanNumber(stockStr) : 0;

            if (price < 0) {
              errors.push(t('excel.errorPriceInvalid'));
            }
            if (hpp < 0) {
              errors.push(t('excel.errorHppInvalid'));
            }

            // Kelola Stok boolean: default to true
            let trackStock = true;
            if (trackStockStr) {
              const lower = trackStockStr.toLowerCase();
              if (lower === 'tidak' || lower === 'no' || lower === 'false' || lower === '0' || lower === 'salah') {
                trackStock = false;
              }
            }

            if (trackStock && stock < 0) {
              errors.push(t('excel.errorStockInvalid'));
            }

            // Tingkat harga yang tak terbaca dilaporkan sebagai galat baris,
            // bukan dibuang diam-diam — kehilangan harga grosir tanpa peringatan
            // adalah persis jebakan yang mau dihindari kolom ini.
            const parsedTiers = parseTiersFromSheet(priceTiersRaw);
            if (parsedTiers.invalid.length > 0) {
              errors.push(t('excel.errorPriceTiersInvalid', { values: parsedTiers.invalid.join(', ') }));
            }

            tempRows.push({
              rowNum: rowNumber,
              name,
              sku,
              categoryName,
              price: price >= 0 ? price : 0,
              hpp: hpp >= 0 ? hpp : 0,
              trackStock,
              stock: stock >= 0 ? stock : 0,
              unit,
              barcode,
              description,
              priceTiers: parsedTiers.tiers,
              isValid: errors.length === 0,
              errors
            });
          });

          setImportRows(tempRows);
          setIsValidating(false);
        } catch (err) {
          console.error(err);
          toast.error('Gagal membaca file Excel.');
          setIsValidating(false);
        }
      };

      reader.onerror = () => {
        toast.error('Gagal membaca file.');
        setIsValidating(false);
      };

      reader.readAsArrayBuffer(file);
    } catch (err) {
      console.error(err);
      toast.error('Gagal memproses file.');
      setIsValidating(false);
    }
  };

  const handleSaveImport = async () => {
    const validRows = importRows.filter(r => r.isValid);
    if (validRows.length === 0) {
      toast.error('Tidak ada data valid yang bisa disimpan.');
      return;
    }

    try {
      const now = new Date();
      const activeCats = categories || [];

      const newProducts: Product[] = validRows.map(r => {
        const matchedCat = activeCats.find(c => c.name.toLowerCase().trim() === r.categoryName.toLowerCase().trim());
        const categoryId = matchedCat?.id || 0;

        return {
          name: r.name,
          sku: r.sku,
          categoryId,
          price: r.price,
          priceTiers: r.priceTiers,
          hpp: r.hpp,
          stock: r.trackStock ? r.stock : 0,
          trackStock: r.trackStock,
          unit: r.unit,
          barcode: r.barcode,
          description: r.description,
          photo: undefined,
          createdAt: now,
          updatedAt: now,
          isDeleted: 0,
          deletedAt: null,
          createdBy: currentUser?.id,
          updatedBy: currentUser?.id
        };
      });

      await db.products.bulkAdd(newProducts);
      trackEvent('import_products_excel');

      toast.success(t('excel.toastSuccess', { count: newProducts.length }));
      setImportDialogOpen(false);
      setImportRows([]);
      setImportFile(null);
    } catch (err) {
      console.error(err);
      toast.error('Gagal menyimpan produk ke database.');
    }
  };

  return (
    <div className="page-container space-y-4">
      <PageHeader
        icon={PackageIcon}
        title={t('title')}
        inlineActions={
          canManage ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" aria-label={t('moreActions', { defaultValue: 'Aksi lain' })}>
                  <MoreVertical />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[180px]">
                {/* Tambah produk lewat suara masih dikembangkan: terlihat supaya
                    pemilik toko tahu fiturnya akan datang, tapi belum bisa dibuka. */}
                <DropdownMenuItem disabled className="gap-2.5">
                  <Mic className="w-4 h-4" />
                  {t('speech.button')}
                  <span className="ml-auto rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-primary">
                    {t('speech.comingSoon')}
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setScanDialogOpen(true)} className="gap-2.5">
                  <Camera className="w-4 h-4" />
                  {t('scan.button')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setImportDialogOpen(true)} className="gap-2.5">
                  <Upload className="w-4 h-4" />
                  {t('excel.importButton')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : undefined
        }
      >
        {canManage && (
          <Button onClick={openAdd}>
            <Plus />
            {t('addButton')}
          </Button>
        )}
      </PageHeader>
      <HubTabs />

      {/* Ringkasan stok — tiga angka yang menentukan tindakan hari ini.
          Jumlah SKU informatif; menipis & habis adalah yang bikin rugi. */}
      <div className="grid grid-cols-3 gap-2">
        <StatCard label={t('summary.totalSku')} value={products?.length ?? 0} />
        <button
          type="button"
          onClick={() => setStockFilter(stockFilter === 'low' ? 'all' : 'low')}
          aria-pressed={stockFilter === 'low'}
          className="rounded-xl text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30"
        >
          <StatCard
            label={t('summary.lowStock')}
            value={lowStockProducts.length}
            valueClassName="text-warning-text"
            className={cn('h-full transition-colors', stockFilter === 'low' && 'border-warning/30 bg-warning/5')}
          />
        </button>
        <button
          type="button"
          onClick={() => setStockFilter(stockFilter === 'out' ? 'all' : 'out')}
          aria-pressed={stockFilter === 'out'}
          className="rounded-xl text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30"
        >
          <StatCard
            label={t('summary.outOfStock')}
            value={outOfStockProducts.length}
            valueClassName="text-destructive-text"
            className={cn('h-full transition-colors', stockFilter === 'out' && 'border-destructive/30 bg-destructive/5')}
          />
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('searchPlaceholder')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder={t('filterCategory')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('filterAll')}</SelectItem>
            {categories?.map(c => (
              <SelectItem key={c.id} value={c.id!.toString()}>{c.icon} {c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Product count */}
      <p className="text-xs text-muted-foreground">{t('productCount', { count: filtered.length })}</p>

      {/* Product List — Figma Manajerku list pattern */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={PackageIcon}
          title={t('empty.title')}
          action={
            canManage ? (
              <Button variant="outline" size="sm" className="mt-3" onClick={openAdd}>
                <Plus className="w-4 h-4 mr-1" /> {t('empty.addButton')}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ItemGroup>
          {filtered.map(p => (
            <Item key={p.id}>
              <ItemMedia tone="muted">
                {p.photo ? <img src={p.photo} alt={p.name} /> : <PackageIcon />}
              </ItemMedia>
              <ItemContent>
                <ItemTitle>{p.name}</ItemTitle>
                <ItemDescription>
                  {p.sku || '-'} · {getCategoryName(p.categoryId)}
                </ItemDescription>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1">
                  <span className="text-sm font-semibold tabular-nums">{rp(p.price)}</span>
                  <span className="text-xs text-muted-foreground">{t('card.hpp')} {rp(p.hpp)}</span>
                  {hasTiers(p) && (
                    <Badge variant="secondary" size="sm">
                      {t('card.priceTiers', { count: (p.priceTiers ?? []).length })}
                    </Badge>
                  )}
                  {isStockManaged(p) ? (
                    <Badge variant={p.stock <= 0 ? 'destructive' : p.stock <= LOW_STOCK_THRESHOLD ? 'warning' : 'success'} size="sm">
                      {p.stock <= 0 ? t('summary.outOfStock') : `${p.stock} ${p.unit}`}
                    </Badge>
                  ) : (
                    <Badge variant="outline" size="sm" className="gap-1">
                      <InfinityIcon className="h-3 w-3" />
                      {t('card.stockUnmanaged')}
                    </Badge>
                  )}
                </div>
              </ItemContent>
              {canManage && (
                <ItemActions>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm" aria-label={t('moreActions', { defaultValue: 'Aksi' })}>
                        <MoreVertical />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-[140px]">
                      <DropdownMenuItem onClick={() => openEdit(p)} className="gap-2.5">
                        <Edit2 className="h-4 w-4" />
                        {t('editButton', { defaultValue: 'Edit' })}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setDeleteId(p.id!)} className="gap-2.5 text-destructive-text focus:text-destructive-text">
                        <Trash2 className="h-4 w-4" />
                        {t('deleteButton', { defaultValue: 'Hapus' })}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </ItemActions>
              )}
            </Item>
          ))}
        </ItemGroup>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editProduct ? t('dialog.titleEdit') : t('dialog.titleAdd')}</DialogTitle>
          </DialogHeader>
          <div className="mt-2 space-y-3.5">
            {/* Photo picker */}
            <div className="space-y-1">
              <Label>{t('dialog.photoLabel')}</Label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="flex h-16 w-16 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed border-input text-muted-foreground transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30"
                  onClick={() => fileInputRef.current?.click()}
                  aria-label={t('dialog.photoSelect')}
                >
                  {photo ? (
                    <img src={photo} alt={t('dialog.photoPreviewAlt')} className="h-full w-full object-cover" />
                  ) : (
                    <Camera className="h-5 w-5" />
                  )}
                </button>
                <div className="flex flex-col gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera />
                    {photo ? t('dialog.photoChange') : t('dialog.photoSelect')}
                  </Button>
                  {photo && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive-text hover:text-destructive-text"
                      onClick={() => setPhoto(undefined)}
                    >
                      <X />
                      {t('dialog.photoRemove')}
                    </Button>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoSelect}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>{t('dialog.nameLabel')} <span className="text-destructive">*</span></Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder={t('dialog.namePlaceholder')} />
            </div>
            <div className="space-y-1">
              <Label>{t('dialog.skuLabel')} <span className="text-destructive">*</span></Label>
              <div className="flex gap-2">
                <Input value={sku} onChange={e => setSku(e.target.value)} placeholder={t('dialog.skuPlaceholder')} className="flex-1" />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  title={t('dialog.scanCamera')}
                  onClick={() => setScanTarget('sku')}
                >
                  <ScanLine className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-1">
              <Label>{t('dialog.categoryLabel')} <span className="text-destructive">*</span></Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger><SelectValue placeholder={t('dialog.categoryPlaceholder')} /></SelectTrigger>
                <SelectContent>
                  {(categories && categories.length > 0) ? categories.map(c => (
                    <SelectItem key={c.id} value={c.id!.toString()}>{c.icon} {c.name}</SelectItem>
                  )) : (
                    <SelectItem value="__empty" disabled>{t('dialog.categoryEmpty')}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{t('dialog.priceLabel')} <span className="text-destructive">*</span></Label>
                <Input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder={t('dialog.pricePlaceholder')} />
              </div>
              <div className="space-y-1">
                <Label>{t('dialog.hppLabel')}</Label>
                <Input type="number" value={hpp} onChange={e => setHpp(e.target.value)} placeholder={t('dialog.hppPlaceholder')} />
              </div>
            </div>

            {/* Harga bertingkat — kasir memilih tingkatnya otomatis dari jumlah,
                jadi yang perlu diisi di sini hanya "mulai berapa" dan "berapa harganya". */}
            <div className="space-y-2 rounded-xl border border-border p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <Label>{t('dialog.priceTiers.label')}</Label>
                  <p className="mt-1 text-xs leading-snug text-muted-foreground">{t('dialog.priceTiers.hint')}</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() => setPriceTiers(prev => [...prev, { name: '', price: 0, minQty: 2 }])}
                >
                  <Plus />
                  {t('dialog.priceTiers.add')}
                </Button>
              </div>

              {priceTiers.map((tier, index) => (
                <div key={index} className="flex items-center gap-1.5">
                  <Input
                    value={tier.name}
                    onChange={e => setPriceTiers(prev => prev.map((row, i) => i === index ? { ...row, name: e.target.value } : row))}
                    placeholder={t('dialog.priceTiers.namePlaceholder')}
                    className="flex-[1.2]"
                  />
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={tier.minQty || ''}
                    onChange={e => setPriceTiers(prev => prev.map((row, i) => i === index ? { ...row, minQty: Number(e.target.value) || 0 } : row))}
                    placeholder={t('dialog.priceTiers.minQtyPlaceholder')}
                    className="w-[72px]"
                  />
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={tier.price || ''}
                    onChange={e => setPriceTiers(prev => prev.map((row, i) => i === index ? { ...row, price: Number(e.target.value) || 0 } : row))}
                    placeholder={t('dialog.priceTiers.pricePlaceholder')}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={t('dialog.priceTiers.remove')}
                    className="shrink-0 text-muted-foreground"
                    onClick={() => setPriceTiers(prev => prev.filter((_, i) => i !== index))}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Item>
              <ItemContent>
                <ItemTitle>{t('dialog.manageStockLabel')}</ItemTitle>
                <ItemDescription className="line-clamp-2">
                  {trackStock
                    ? t('dialog.stockEnabledHint')
                    : t('dialog.stockDisabledHint')}
                </ItemDescription>
              </ItemContent>
              <Switch checked={trackStock} onCheckedChange={setTrackStock} />
            </Item>
            <div className="grid grid-cols-2 gap-3">
              {trackStock && (
                <div className="space-y-1">
                  <Label>{t('dialog.stockLabel')}</Label>
                  <Input type="number" value={stock} onChange={e => setStock(e.target.value)} placeholder={t('dialog.stockPlaceholder')} />
                </div>
              )}
              <div className={cn('space-y-1', !trackStock && 'col-span-2')}>
                <Label>{t('dialog.unitLabel')}</Label>
                <Select value={unit} onValueChange={setUnit}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {unitOptions.length === 0 ? (
                      <SelectItem value="pcs">pcs</SelectItem>
                    ) : (
                      unitOptions.map(u => (
                        <SelectItem key={u} value={u}>{u}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>{t('dialog.barcodeLabel')}</Label>
              <div className="flex gap-2">
                <Input value={barcode} onChange={e => setBarcode(e.target.value)} placeholder={t('dialog.barcodePlaceholder')} className="flex-1" />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  title={t('dialog.copyFromSku')}
                  onClick={() => setBarcode(sku.trim())}
                >
                  <Copy className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  title={t('dialog.scanCamera')}
                  onClick={() => setScanTarget('barcode')}
                >
                  <ScanLine className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-1">
              <Label>{t('dialog.descriptionLabel')}</Label>
              <Textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder={t('dialog.descriptionPlaceholder')}
                rows={2}
                maxLength={500}
              />
              <p className="mt-1 text-right text-xs text-muted-foreground">{description.length}{t('dialog.descriptionCounter')}</p>
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" size="xl" className="flex-1" onClick={() => setDialogOpen(false)}>
                {t('deleteDialog.cancel')}
              </Button>
              <Button size="xl" className="flex-[2]" onClick={handleSave} disabled={!name.trim() || !categoryId || !sku.trim()}>
                {editProduct ? t('saveButton.edit') : t('saveButton.add')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="max-w-[90vw]">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>{t('deleteDialog.description')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('deleteDialog.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-white shadow-destructive hover:bg-destructive/90">{t('deleteDialog.confirm')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import Excel Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={(open) => {
        setImportDialogOpen(open);
        if (!open) {
          setImportFile(null);
          setImportRows([]);
          setHasMoreThan100(false);
          if (importFileInputRef.current) importFileInputRef.current.value = '';
        }
      }}>
        <DialogContent className="max-w-[95vw] sm:max-w-[80vw] md:max-w-[70vw] lg:max-w-[60vw] xl:max-w-[50vw] max-h-[90vh] flex flex-col p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-primary" />
              {t('excel.dialogTitle')}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 my-2 pr-1">
            {!importFile ? (
              // Step 1: Upload and template download
              <div className="space-y-6 py-4">
                <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
                  <h3 className="font-semibold text-sm flex items-center gap-1.5">
                    <Download className="w-4 h-4 text-primary" />
                    {t('excel.step1')}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {t('excel.step1Desc')}
                  </p>
                  <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-1.5">
                    <Download className="w-3.5 h-3.5" />
                    {t('excel.downloadTemplate')}
                  </Button>
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold text-sm flex items-center gap-1.5">
                    <Upload className="w-4 h-4 text-primary" />
                    {t('excel.step2')}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {t('excel.step2Desc')}
                  </p>
                  <div
                    onClick={() => importFileInputRef.current?.click()}
                    className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-input p-8 text-center transition-colors hover:border-primary/50 hover:bg-muted/30"
                  >
                    <FileSpreadsheet className="w-10 h-10 text-muted-foreground/50" />
                    <p className="text-sm font-medium">{t('excel.selectFile')}</p>
                    <p className="text-xs text-muted-foreground">{t('excel.dragDrop')}</p>
                    <input
                      ref={importFileInputRef}
                      type="file"
                      accept=".xlsx, .xls"
                      className="hidden"
                      onChange={handleExcelUpload}
                    />
                  </div>
                </div>
              </div>
            ) : isValidating ? (
              // Loading screen
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <p className="text-sm font-medium text-muted-foreground">Memproses dan memvalidasi data...</p>
              </div>
            ) : (
              // Validation Preview screen
              <div className="space-y-4">
                {/* 100 row limit warning */}
                {hasMoreThan100 && (
                  <Alert variant="warning">
                    <AlertTriangle />
                    <AlertTitle>{t('excel.rowLimitWarning')}</AlertTitle>
                  </Alert>
                )}

                {/* Summary header */}
                <div className="flex items-center justify-between bg-muted/40 p-3 rounded-xl border border-border">
                  <span className="text-xs font-medium text-muted-foreground">
                    {t('excel.summary', {
                      total: importRows.length,
                      valid: importRows.filter(r => r.isValid).length,
                      invalid: importRows.filter(r => !r.isValid).length
                    })}
                  </span>
                </div>

                {/* Preview Table */}
                <div className="rounded-xl border border-border overflow-hidden">
                  <div className="max-h-[40vh] overflow-y-auto">
                    <Table>
                      <TableHeader className="bg-muted/55 sticky top-0 z-10">
                        <TableRow>
                          <TableHead className="w-[60px] text-center font-semibold">{t('excel.row')}</TableHead>
                          <TableHead className="font-semibold">Nama Produk</TableHead>
                          <TableHead className="font-semibold">SKU</TableHead>
                          <TableHead className="font-semibold">Kategori</TableHead>
                          <TableHead className="font-semibold text-right">Harga</TableHead>
                          <TableHead className="font-semibold">Satuan</TableHead>
                          <TableHead className="font-semibold">{t('excel.status')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {importRows.map((row) => (
                          <TableRow
                            key={row.rowNum}
                            className={cn(
                              !row.isValid && "bg-destructive/5 hover:bg-destructive/10 text-destructive-text"
                            )}
                          >
                            <TableCell className="text-center font-medium">{row.rowNum}</TableCell>
                            <TableCell className="font-medium truncate max-w-[150px]">{row.name || '-'}</TableCell>
                            <TableCell className="font-mono text-xs">{row.sku || '-'}</TableCell>
                            <TableCell>{row.categoryName || '-'}</TableCell>
                            <TableCell className="text-right font-mono">{rp(row.price)}</TableCell>
                            <TableCell>{row.unit || '-'}</TableCell>
                            <TableCell>
                              {row.isValid ? (
                                <span className="flex items-center gap-1 text-xs text-success-text font-medium">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Valid
                                </span>
                              ) : (
                                <div className="space-y-1">
                                  {row.errors.map((err, i) => (
                                    <span key={i} className="flex items-start gap-1 text-[11px] text-destructive-text leading-tight">
                                      <XCircle className="w-3 h-3 shrink-0 mt-0.5" />
                                      {err}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Footer choices */}
                <div className="flex flex-col sm:flex-row justify-end items-center gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setImportFile(null);
                      setImportRows([]);
                      setHasMoreThan100(false);
                      if (importFileInputRef.current) importFileInputRef.current.value = '';
                    }}
                    className="w-full sm:w-auto gap-1.5"
                  >
                    <Upload className="w-4 h-4" />
                    {t('excel.btnReupload')}
                  </Button>
                  <Button
                    onClick={handleSaveImport}
                    disabled={importRows.filter(r => r.isValid).length === 0}
                    className="w-full sm:w-auto gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {t('excel.btnProceedValid', {
                      count: importRows.filter(r => r.isValid).length
                    })}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ScanProductsDialog open={scanDialogOpen} onClose={() => setScanDialogOpen(false)} />

      <SpeechProductsDialog open={speechDialogOpen} onClose={() => setSpeechDialogOpen(false)} />

      {/* Scanner kamera untuk SKU / Barcode */}
      <BarcodeScanner
        open={scanTarget !== null}
        onClose={() => setScanTarget(null)}
        onScan={(value) => {
          const v = value.trim();
          if (scanTarget === 'sku') setSku(v);
          else if (scanTarget === 'barcode') setBarcode(v);
          setScanTarget(null);
        }}
      />
    </div>
  );
}
