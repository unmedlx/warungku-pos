import { useLiveQuery } from 'dexie-react-hooks';
import { db, isStockManaged, type Product, type Category, type Transaction, type TransactionItemRecord } from '@/lib/db';
import { useState, useEffect, useMemo } from 'react';
import { Search, Check, ScanBarcode, Mic, HandCoins, Clock, Package as PackageIcon, ClipboardList, User, Hash, FileText, Printer, Trash2, Save, Plus, ChevronRight } from '@/components/icons';
import Receipt from '@/components/Receipt';
import KitchenTicket from '@/components/KitchenTicket';
import BarcodeScanner from '@/components/BarcodeScanner';
import VoiceCartPage from '@/components/cashier/VoiceCartPage';
import { useCartDictation } from '@/hooks/use-cart-dictation';
import { useVoiceCartQuota } from '@/hooks/use-voice-cart-quota';
import { Card, CardContent } from '@/components/jokoui/card';
import { Button } from '@/components/jokoui/button';
import { Input } from '@/components/jokoui/input';
import { Badge } from '@/components/jokoui/badge';
import { Switch } from '@/components/jokoui/switch';
import { PageHeader } from '@/components/jokoui/page-header';
import {
  MoneyPanel,
  MoneyPanelAmount,
  MoneyPanelFooter,
  MoneyPanelLabel,
} from '@/components/jokoui/money-panel';
import { ActionBar, ActionButton } from '@/components/jokoui/action-bar';
import { toneForId, toneForName, TONE_SURFACE } from '@/lib/tones';
import { EmptyState } from '@/components/jokoui/empty-state';
import { Item, ItemMedia, ItemContent, ItemTitle, ItemDescription, ItemActions } from '@/components/jokoui/item';
import { DataList, DataListRow } from '@/components/jokoui/data-list';
import { SegmentGroup } from '@/components/jokoui/segment-group';
import { CategoryChip, CategoryStrip } from '@/components/jokoui/category-chip';
import { Label } from '@/components/jokoui/label';
import { NumPad, QuickCashRow } from '@/components/jokoui/numpad';
import { QtyStepper } from '@/components/jokoui/qty-stepper';
import { unitPrice, tiersOf, autoTier, resolveTier } from '@/lib/price-tiers';
import { PriceTierSeg } from '@/components/jokoui/price-tier-seg';
import { TableGrid, type TableSlot } from '@/components/jokoui/table-grid';
import { deriveTableSlots } from '@/lib/tables';
import { MoneyDisplay } from '@/components/jokoui/money-display';
import { useBusinessMode } from '@/hooks/use-business-mode';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { id, enUS, ms } from 'date-fns/locale';
import type { Locale } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/use-auth';
import { trackEvent } from '@/lib/analytics';
import CustomerPicker from '@/components/CustomerPicker';
import { CartItems, CustomerTableInputs, CartSummary, type CartItem } from '@/components/cashier/CartPanel';
import LockedPage from '@/components/LockedPage';
import { setTransactionBusy } from '@/lib/transaction-busy';
import { useLocation, useNavigate } from 'react-router-dom';

const CURRENCY_SYMBOL: Record<string, string> = {
  id: 'Rp',
  en: '$',
  ms: 'Rp',
};

const NUMBER_LOCALES: Record<string, string> = {
  id: 'id-ID',
  en: 'en-US',
  ms: 'ms-MY',
};

const LOCALES: Record<string, Locale> = {
  id,
  en: enUS,
  ms,
};

export default function Kasir() {
  const { currentUser, can } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation('settings');

  const lang = i18n.language?.split('-')[0] || 'id';
  const dateLocale = LOCALES[lang] || id;
  const numberLocale = NUMBER_LOCALES[lang] || 'id-ID';
  const currencySymbol = CURRENCY_SYMBOL[lang] || 'Rp';
  const rp = (n: number) => `${currencySymbol} ${n.toLocaleString(numberLocale)}`;

  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [cart, setCart] = useState<CartItem[]>([]);

  // Dialog update aplikasi menunggu sampai keranjang kosong.
  useEffect(() => {
    setTransactionBusy(cart.length > 0);
  }, [cart.length]);
  useEffect(() => () => setTransactionBusy(false), []);
  const [editingTxId, setEditingTxId] = useState<number | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [txDiscountType, setTxDiscountType] = useState<'percentage' | 'nominal' | null>(null);
  const [txDiscountValue, setTxDiscountValue] = useState('');
  const [discountDialogOpen, setDiscountDialogOpen] = useState(false);
  const [tempDiscountType, setTempDiscountType] = useState<'percentage' | 'nominal'>('nominal');
  const [tempDiscountValue, setTempDiscountValue] = useState('');
  // Item-level discount dialog state
  const [itemDiscountTargetId, setItemDiscountTargetId] = useState<number | null>(null);
  const [itemDiscountType, setItemDiscountType] = useState<'percentage' | 'nominal'>('nominal');
  const [itemDiscountValue, setItemDiscountValue] = useState('');
  const [paymentMethodId, setPaymentMethodId] = useState<string>('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [useDebt, setUseDebt] = useState(false);
  /** Tanggal jatuh tempo kasbon (format yyyy-mm-dd). Kosong = tanpa tenggat. */
  const [debtDueDate, setDebtDueDate] = useState('');
  const [isQuickAdding, setIsQuickAdding] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<Transaction | null>(null);
  const [lastTxItems, setLastTxItems] = useState<TransactionItemRecord[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerId, setCustomerId] = useState<number | undefined>(undefined);
  const [tableNumber, setTableNumber] = useState('');
  const [remarks, setRemarks] = useState('');
  // Order bungkus melewati pemilihan meja tanpa mematikan denahnya.
  const [takeAwayMode, setTakeAwayMode] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [openBillsOpen, setOpenBillsOpen] = useState(false);
  const [editingItemNotes, setEditingItemNotes] = useState<number | null>(null);
  const [tempItemNotes, setTempItemNotes] = useState('');
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelTargetTx, setCancelTargetTx] = useState<Transaction | null>(null);
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);
  const [kitchenTicketOpen, setKitchenTicketOpen] = useState(false);
  const [kitchenTicketTx, setKitchenTicketTx] = useState<Transaction | null>(null);
  const [kitchenTicketItems, setKitchenTicketItems] = useState<TransactionItemRecord[]>([]);

  // Cashier layout mode settings (default: 'grid')
  const { traits } = useBusinessMode();

  const [storedLayoutMode] = useState<'grid' | 'rows'>(() => {
    try {
      return (localStorage.getItem('kg_cashier_layout_mode') as 'grid' | 'rows') || 'grid';
    } catch {
      return 'grid';
    }
  });

  /**
   * Grid produk berguna kalau barangnya sedikit dan dikenali dari foto. Grosir
   * punya ratusan SKU dan pembelinya menyebut nama, jadi mode itu dipaksa ke
   * daftar — bukan preferensi user, tapi konsekuensi jenis usahanya.
   */
  const layoutMode = traits.preferListLayout ? 'rows' : storedLayoutMode;

  const products = useLiveQuery(() => db.products.where('isDeleted').equals(0).toArray());
  const categories = useLiveQuery(() => db.categories.where('isDeleted').equals(0).toArray());
  const paymentMethods = useLiveQuery(() => db.paymentMethods.toArray());
  const storeSettings = useLiveQuery(() => db.storeSettings.toCollection().first());
  const openBills = useLiveQuery(() => db.transactions.where('status').equals('open').reverse().sortBy('date'));
  const allUsers = useLiveQuery(() => db.users.toArray());
  const customers = useLiveQuery(() => db.customers.where('isDeleted').equals(0).toArray());

  // Permission gate — kept render-side (not redirect) so the bottom nav stays
  // intact. All hooks above run unconditionally; we just swap the rendered tree.
  const allowed = can('create_transaction');

  const cartProductIds = new Set(cart.map(c => c.product.id));

  const filtered = products?.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchCategory = filterCategory === 'all' || p.categoryId === Number(filterCategory);
    const available = !isStockManaged(p) || p.stock > 0 || cartProductIds.has(p.id!);
    return matchSearch && matchCategory && available;
  }) ?? [];

  const doFullReset = () => {
    setCart([]);
    setEditingTxId(null);
    setTxDiscountType(null);
    setTxDiscountValue('');
    setPaymentMethodId('');
    setPaymentAmount('');
    setUseDebt(false);
    setDebtDueDate('');
    setCustomerName('');
    setCustomerId(undefined);
    setTableNumber('');
    setRemarks('');
    setTakeAwayMode(false);
    setIsQuickAdding(false);
    // Transaksi selesai berarti tidak ada lagi yang perlu didengar. Membiarkan
    // mikrofon hidup antar-pembeli membuat obrolan kasir ikut terurai, dan itu
    // cara tercepat membuat fitur ini kehilangan kepercayaan.
    void voice.stop();
  };

  // === Cart Operations ===

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(c => c.product.id === product.id);
      if (existing) {
        if (isStockManaged(product) && existing.qty >= product.stock) {
          toast.error(t('cashier.toast.stockLow'));
          return prev;
        }
        return prev.map(c => c.product.id === product.id ? { ...c, qty: c.qty + 1 } : c);
      }
      return [...prev, { product, qty: 1, discountType: null, discountValue: 0 }];
    });
  };

  /**
   * Masukkan barang yang disebut kasir, lengkap dengan jumlahnya.
   *
   * Dipisah dari `addToCart` karena dua hal yang tidak berlaku pada ketukan:
   * jumlahnya datang sekaligus (bukan naik satu-satu), dan penolakan harus
   * dilaporkan balik lewat nilai kembalian — chip di layar berubah jadi
   * penolakan yang terlihat, bukan hilang diam-diam. Ucapan benar yang tidak
   * berbekas jauh lebih membingungkan daripada penolakan yang jelas.
   *
   * Mengembalikan `false` kalau stok tidak mencukupi.
   */
  const addSpokenToCart = (product: Product, qty: number): boolean => {
    if (isStockManaged(product) && product.stock <= 0) return false;

    let accepted = true;
    setCart(prev => {
      const existing = prev.find(c => c.product.id === product.id);
      const nextQty = (existing?.qty ?? 0) + qty;

      if (isStockManaged(product) && nextQty > product.stock) {
        accepted = false;
        return prev;
      }

      if (existing) {
        return prev.map(c =>
          c.product.id === product.id ? { ...c, qty: nextQty, fromVoice: true } : c,
        );
      }
      return [...prev, { product, qty, discountType: null, discountValue: 0, fromVoice: true }];
    });

    return accepted;
  };

  /**
   * Halaman Keranjang Suara. Terbuka selama kasir memakai suara; menutupnya
   * mematikan mikrofon tapi tidak menyentuh isi keranjang.
   */
  const [voicePageOpen, setVoicePageOpen] = useState(false);

  const openVoicePage = () => {
    // Jatah habis: jangan buka halaman kosong dengan mikrofon yang tak mau menyala.
    if (!voice.listening && !voiceQuota.canStart()) {
      setVoiceUpsellOpen(true);
      return;
    }
    setVoicePageOpen(true);
    if (!voice.listening && !voice.starting) void voice.start();
  };

  const closeVoicePage = () => {
    setVoicePageOpen(false);
    void voice.stop();
  };

  /** Hapus satu baris dari halaman suara, dengan jalan kembali. */
  const removeWithUndo = (item: CartItem) => {
    removeFromCart(item.product.id!);
    toast(t('cashier.voice.page.removed', { name: item.product.name }), {
      action: {
        label: t('cashier.voice.page.undo'),
        onClick: () => setCart(prev => (prev.some(c => c.product.id === item.product.id) ? prev : [...prev, item])),
      },
    });
  };

  const clearWithUndo = () => {
    const snapshot = cart;
    setCart([]);
    toast(t('cashier.voice.page.cleared'), {
      action: { label: t('cashier.voice.page.undo'), onClick: () => setCart(snapshot) },
    });
  };

  /**
   * Mikrofon kasir. Menyala atas permintaan, mati sendiri setelah transaksi
   * ditutup — lihat `doFullReset`.
   */
  const voiceQuota = useVoiceCartQuota();
  const [voiceUpsellOpen, setVoiceUpsellOpen] = useState(false);

  const voice = useCartDictation({
    products: products ?? [],
    // Pengguna gratis: 10 sesi mikrofon per bulan. Pelanggan tidak dibatasi.
    gate: {
      canStart: voiceQuota.canStart,
      onStarted: voiceQuota.recordStart,
      onStopped: voiceQuota.recordStop,
      onBlocked: () => setVoiceUpsellOpen(true),
    },
    onAdd: addSpokenToCart,
    // Ucapan yang tidak dikenali tidak dibuang: ia diserahkan ke kotak
    // pencarian yang sudah ada, jadi kasir lanjut dengan cara lama tanpa
    // mengetik ulang apa yang barusan ia sebut.
    onFallbackSearch: setSearch,
  });

  const updateQty = (productId: number, delta: number) => {
    setCart(prev => prev.map(c => {
      if (c.product.id !== productId) return c;
      const newQty = c.qty + delta;
      if (newQty <= 0) return c;
      if (isStockManaged(c.product) && newQty > c.product.stock) { toast.error(t('cashier.toast.stockLow')); return c; }
      return { ...c, qty: newQty };
    }));
  };

  const setItemQty = (item: CartItem, val: number): number => {
    if (isNaN(val) || val < 1) return item.qty;
    if (isStockManaged(item.product) && val > item.product.stock) {
      toast.error(t('cashier.toast.stockLowWithMax', { max: item.product.stock }));
      setCart(prev => prev.map(c => c.product.id === item.product.id ? { ...c, qty: item.product.stock } : c));
      return item.product.stock;
    }
    setCart(prev => prev.map(c => c.product.id === item.product.id ? { ...c, qty: val } : c));
    return val;
  };

  const removeFromCart = (productId: number) => {
    setCart(prev => prev.filter(c => c.product.id !== productId));
  };

  /**
   * Kunci tingkat harga sebuah baris ke pilihan manual. Menyimpan `undefined`
   * bila yang dipilih memang tingkat otomatisnya, sehingga baris itu kembali
   * mengikuti jumlah saat qty diubah lagi.
   */
  const setItemTier = (productId: number, tierName: string) => {
    setCart(prev => prev.map(c => {
      if (c.product.id !== productId) return c;
      const auto = autoTier(c.product, c.qty);
      return { ...c, tierName: tierName === auto.name ? undefined : tierName };
    }));
  };

  const updateItemNotes = (productId: number, notes: string) => {
    setCart(prev => prev.map(c => c.product.id === productId ? { ...c, notes: notes.trim() || undefined } : c));
  };

  const openItemDiscount = (item: CartItem) => {
    setItemDiscountTargetId(item.product.id!);
    if (item.discountType) {
      setItemDiscountType(item.discountType);
      setItemDiscountValue(String(item.discountValue));
    } else {
      setItemDiscountType('nominal');
      setItemDiscountValue('');
    }
  };

  const saveItemDiscount = () => {
    if (itemDiscountTargetId == null) return;
    const raw = Number(itemDiscountValue) || 0;
    setCart(prev => prev.map(c => {
      if (c.product.id !== itemDiscountTargetId) return c;
      if (raw <= 0) {
        return { ...c, discountType: null, discountValue: 0 };
      }
      const base = unitPrice(c.product, c.qty, c.tierName) * c.qty;
      const clamped = itemDiscountType === 'percentage'
        ? Math.min(100, raw)
        : Math.min(base, raw);
      return { ...c, discountType: itemDiscountType, discountValue: clamped };
    }));
    setItemDiscountTargetId(null);
  };

  const clearItemDiscount = () => {
    if (itemDiscountTargetId == null) return;
    setCart(prev => prev.map(c =>
      c.product.id === itemDiscountTargetId
        ? { ...c, discountType: null, discountValue: 0 }
        : c
    ));
    setItemDiscountTargetId(null);
  };

  /**
   * Harga per unit yang berlaku untuk sebuah baris — tingkat dasar, grosir, atau
   * partai, tergantung jumlah dan pilihan manual. Semua perhitungan di bawah
   * memakai ini alih-alih `product.price` langsung.
   */
  const itemUnitPrice = (item: CartItem) => unitPrice(item.product, item.qty, item.tierName);

  const getItemDiscountAmount = (item: CartItem) => {
    const base = itemUnitPrice(item) * item.qty;
    if (item.discountType === 'percentage') {
      const pct = Math.min(100, Math.max(0, item.discountValue));
      return base * pct / 100;
    }
    if (item.discountType === 'nominal') {
      return Math.min(base, Math.max(0, item.discountValue));
    }
    return 0;
  };

  const getItemSubtotal = (item: CartItem) => {
    const base = itemUnitPrice(item) * item.qty;
    return Math.max(0, base - getItemDiscountAmount(item));
  };

  const subtotal = cart.reduce((sum, item) => sum + getItemSubtotal(item), 0);
  const txDiscountAmount = txDiscountType === 'percentage'
    ? subtotal * Math.min(100, Math.max(0, Number(txDiscountValue) || 0)) / 100
    : txDiscountType === 'nominal'
      ? Math.min(subtotal, Math.max(0, Number(txDiscountValue) || 0))
      : 0;
  const total = Math.max(0, subtotal - txDiscountAmount);
  const paidAmount = Number(paymentAmount) || 0;
  const checkoutPaidAmount = useDebt ? Math.min(total, Math.max(0, paidAmount)) : paidAmount;
  const debtAmount = useDebt ? Math.max(0, total - checkoutPaidAmount) : 0;
  const change = useDebt ? 0 : paidAmount - total;
  const totalItemDiscount = cart.reduce((sum, item) => sum + getItemDiscountAmount(item), 0);
  const totalProfit = cart.reduce((sum, item) => sum + (itemUnitPrice(item) - item.product.hpp) * item.qty, 0) - totalItemDiscount - txDiscountAmount;

  // === Open Bill Operations ===

  const saveOpenBill = async (shouldPrintKitchen: boolean = false) => {
    if (cart.length === 0) { toast.error(t('cashier.toast.cartEmpty')); return; }

    const now = new Date();
    let savedTxObj: Transaction | null = null;
    let savedItemsObj: TransactionItemRecord[] = [];

    if (editingTxId) {
      // Update existing open bill
      const oldItems = await db.transactionItems.where('transactionId').equals(editingTxId).toArray();

      await db.transactions.update(editingTxId, {
        subtotal,
        discountType: txDiscountType,
        discountValue: Number(txDiscountValue) || 0,
        discountAmount: txDiscountAmount,
        total,
        customerId,
        customerName: customerName.trim() || undefined,
        tableNumber: tableNumber.trim() || undefined,
        remarks: remarks.trim() || undefined,
        date: now,
        // Bill yang ditambah item berarti mejanya belum selesai; permintaan bill
        // sebelumnya sudah basi.
        billRequestedAt: null,
      });
      await db.transactionItems.where('transactionId').equals(editingTxId).delete();
      const itemRecords: TransactionItemRecord[] = cart.map(c => ({
        transactionId: editingTxId,
        productId: c.product.id!,
        productName: c.product.name,
        quantity: c.qty,
        price: unitPrice(c.product, c.qty, c.tierName),
        hpp: c.product.hpp,
        discountType: c.discountType,
        discountValue: c.discountValue,
        discountAmount: getItemDiscountAmount(c),
        subtotal: getItemSubtotal(c),
        notes: c.notes,
      }));
      await db.transactionItems.bulkAdd(itemRecords);

      // Adjust stock deltas
      for (const cartItem of cart) {
        if (!isStockManaged(cartItem.product)) continue;
        const oldItem = oldItems.find(oi => oi.productId === cartItem.product.id);
        const oldQty = oldItem?.quantity ?? 0;
        const newQty = cartItem.qty;
        const delta = newQty - oldQty;
        if (delta !== 0) {
          await db.products.update(cartItem.product.id!, { stock: cartItem.product.stock - delta, updatedAt: new Date() });
        }
      }
      // Restore stock for removed items that were in old bill
      for (const oldItem of oldItems) {
        const stillInCart = cart.find(c => c.product.id === oldItem.productId);
        if (!stillInCart) {
          const product = await db.products.get(oldItem.productId);
          if (product && isStockManaged(product)) {
            await db.products.update(oldItem.productId, { stock: product.stock + oldItem.quantity });
          }
        }
      }

      const updatedTx = await db.transactions.get(editingTxId);
      toast.success(t('cashier.toast.billUpdated', { receiptNumber: updatedTx?.receiptNumber }));

      if (updatedTx) {
        savedTxObj = updatedTx;
        savedItemsObj = itemRecords;
      }
    } else {
      const receiptNumber = `TX${Date.now()}`;

      const txData: Transaction = {
        subtotal,
        discountType: txDiscountType,
        discountValue: Number(txDiscountValue) || 0,
        discountAmount: txDiscountAmount,
        total,
        paymentMethodId: 0,
        paymentAmount: 0,
        change: 0,
        profit: 0,
        date: now,
        receiptNumber,
        status: 'open',
        customerId,
        customerName: customerName.trim() || undefined,
        tableNumber: tableNumber.trim() || undefined,
        remarks: remarks.trim() || undefined,
        openedAt: now,
        createdBy: currentUser?.id,
      };

      const txId = await db.transactions.add(txData);

      const itemRecords: TransactionItemRecord[] = cart.map(c => ({
        transactionId: txId as number,
        productId: c.product.id!,
        productName: c.product.name,
        quantity: c.qty,
        price: unitPrice(c.product, c.qty, c.tierName),
        hpp: c.product.hpp,
        discountType: c.discountType,
        discountValue: c.discountValue,
        discountAmount: getItemDiscountAmount(c),
        subtotal: getItemSubtotal(c),
        notes: c.notes,
      }));
      await db.transactionItems.bulkAdd(itemRecords);

      for (const item of cart) {
        if (!isStockManaged(item.product)) continue;
        await db.products.update(item.product.id!, { stock: item.product.stock - item.qty, updatedAt: new Date() });
      }

      toast.success(t('cashier.toast.billSaved', { receiptNumber }));

      savedTxObj = { ...txData, id: txId as number };
      savedItemsObj = itemRecords;
    }

    if (shouldPrintKitchen && savedTxObj) {
      setKitchenTicketTx(savedTxObj);
      setKitchenTicketItems(savedItemsObj);
      setKitchenTicketOpen(true);
    }

    doFullReset();
    setCartOpen(false);
  };

  const loadOpenBill = async (tx: Transaction) => {
    if (!tx.id) return;
    const items = await db.transactionItems.where('transactionId').equals(tx.id).toArray();
    const allProducts = await db.products.where('isDeleted').equals(0).toArray();

    const cartItems: CartItem[] = items.map(item => {
      const product = allProducts.find(p => p.id === item.productId);
      if (!product) throw new Error(t('cashier.toast.productNotFoundLoadBill', { name: item.productName }));
      // Harga di bill tersimpan sebagai angka, bukan nama tingkat. Kalau harga
      // itu cocok dengan salah satu tingkat yang ada, pulihkan pilihannya;
      // kalau tidak (harga produk sudah diubah sejak bill dibuat), biarkan
      // otomatis agar keranjang tidak memakai harga yang tak berlaku lagi.
      const matched = tiersOf(product).find(tier => tier.price === item.price);
      const auto = autoTier(product, item.quantity);
      return {
        product,
        qty: item.quantity,
        tierName: matched && matched.name !== auto.name ? matched.name : undefined,
        discountType: item.discountType as 'percentage' | 'nominal' | null,
        discountValue: item.discountValue,
        notes: item.notes,
      };
    });

    setCart(cartItems);
    setEditingTxId(tx.id);
    setTxDiscountType(tx.discountType);
    setTxDiscountValue(tx.discountType ? String(tx.discountValue) : '');
    setCustomerName(tx.customerName || '');
    setCustomerId(tx.customerId);
    setTableNumber(tx.tableNumber || '');
    setRemarks(tx.remarks || '');
    setOpenBillsOpen(false);
    setCartOpen(true);
  };

  const cancelOpenBill = async (tx: Transaction) => {
    if (!tx.id) return;
    const items = await db.transactionItems.where('transactionId').equals(tx.id).toArray();
    for (const item of items) {
      const product = await db.products.get(item.productId);
      if (product && isStockManaged(product)) {
        await db.products.update(item.productId, { stock: product.stock + item.quantity });
      }
    }
    await db.transactionItems.where('transactionId').equals(tx.id).delete();
    await db.transactions.delete(tx.id);
    toast.success(t('cashier.toast.billCancelled', { receiptNumber: tx.receiptNumber }));
    setCancelDialogOpen(false);
    setCancelTargetTx(null);
    if (editingTxId === tx.id) {
      doFullReset();
      setCartOpen(false);
    }
  };

  const handleCancelFromCart = () => {
    const tx = openBills?.find(b => b.id === editingTxId);
    if (tx) {
      setCancelTargetTx(tx);
      setCancelDialogOpen(true);
    }
  };

  const handleCancelFromList = (bill: Transaction) => {
    setCancelTargetTx(bill);
    setCancelDialogOpen(true);
  };

  // === Checkout ===

  const handleCheckout = async () => {
    if (useDebt) {
      if (!storeSettings?.allowDebt) return;
      if (!customerId) {
        toast.error(t('cashier.toast.selectCustomerForDebt'));
        return;
      }
      if (paidAmount < 0 || paidAmount > total) {
        toast.error(t('cashier.toast.paymentAmountRange', { symbol: currencySymbol }));
        return;
      }
      if (checkoutPaidAmount > 0 && !paymentMethodId) {
        toast.error(t('cashier.toast.selectPaymentMethod'));
        return;
      }
    } else if (!paymentMethodId || paidAmount < total) {
      return;
    }

    if (editingTxId) {
      // Update existing open bill → paid
      const oldItems = await db.transactionItems.where('transactionId').equals(editingTxId).toArray();

      await db.transactions.update(editingTxId, {
        status: 'completed',
        subtotal,
        discountType: txDiscountType,
        discountValue: Number(txDiscountValue) || 0,
        discountAmount: txDiscountAmount,
        total,
        paymentMethodId: checkoutPaidAmount > 0 ? Number(paymentMethodId) : 0,
        paymentAmount: checkoutPaidAmount,
        change,
        profit: totalProfit,
        customerId,
        customerName: customerName.trim() || undefined,
        tableNumber: tableNumber.trim() || undefined,
        remarks: remarks.trim() || undefined,
        closedAt: new Date(),
        debtAmount,
      });

      if (debtAmount > 0) {
        await db.debts.add({
          transactionId: editingTxId,
          customerId: customerId!,
          customerName: customerName.trim(),
          originalAmount: debtAmount,
          remainingAmount: debtAmount,
          status: checkoutPaidAmount > 0 ? 'partial' : 'unpaid',
          createdAt: new Date(),
          dueDate: debtDueDate ? new Date(debtDueDate) : null,
          settledAt: null,
        });
      }

      await db.transactionItems.where('transactionId').equals(editingTxId).delete();
      const itemRecords: TransactionItemRecord[] = cart.map(c => ({
        transactionId: editingTxId,
        productId: c.product.id!,
        productName: c.product.name,
        quantity: c.qty,
        price: unitPrice(c.product, c.qty, c.tierName),
        hpp: c.product.hpp,
        discountType: c.discountType,
        discountValue: c.discountValue,
        discountAmount: getItemDiscountAmount(c),
        subtotal: getItemSubtotal(c),
        notes: c.notes,
      }));
      await db.transactionItems.bulkAdd(itemRecords);

      // Adjust stock deltas (same as saveOpenBill)
      for (const cartItem of cart) {
        if (!isStockManaged(cartItem.product)) continue;
        const oldItem = oldItems.find(oi => oi.productId === cartItem.product.id);
        const oldQty = oldItem?.quantity ?? 0;
        const newQty = cartItem.qty;
        const delta = newQty - oldQty;
        if (delta !== 0) {
          await db.products.update(cartItem.product.id!, { stock: cartItem.product.stock - delta, updatedAt: new Date() });
        }
      }
      for (const oldItem of oldItems) {
        const stillInCart = cart.find(c => c.product.id === oldItem.productId);
        if (!stillInCart) {
          const product = await db.products.get(oldItem.productId);
          if (product && isStockManaged(product)) {
            await db.products.update(oldItem.productId, { stock: product.stock + oldItem.quantity });
          }
        }
      }

      const updatedTx = await db.transactions.get(editingTxId);
      toast.success(t('cashier.toast.transactionSuccess', { receiptNumber: updatedTx?.receiptNumber }));
      trackEvent('create_transaction');
      setLastTransaction(updatedTx || null);
      setLastTxItems(itemRecords);
      setReceiptOpen(true);
    } else {
      const receiptNumber = `TX${Date.now()}`;

      const txData: Transaction = {
        subtotal,
        discountType: txDiscountType,
        discountValue: Number(txDiscountValue) || 0,
        discountAmount: txDiscountAmount,
        total,
        paymentMethodId: checkoutPaidAmount > 0 ? Number(paymentMethodId) : 0,
        paymentAmount: checkoutPaidAmount,
        change,
        profit: totalProfit,
        date: new Date(),
        receiptNumber,
        status: 'completed',
        customerId,
        customerName: customerName.trim() || undefined,
        tableNumber: tableNumber.trim() || undefined,
        remarks: remarks.trim() || undefined,
        createdBy: currentUser?.id,
        debtAmount,
      };

      const txId = await db.transactions.add(txData);

      if (debtAmount > 0) {
        await db.debts.add({
          transactionId: txId as number,
          customerId: customerId!,
          customerName: customerName.trim(),
          originalAmount: debtAmount,
          remainingAmount: debtAmount,
          status: checkoutPaidAmount > 0 ? 'partial' : 'unpaid',
          createdAt: new Date(),
          dueDate: debtDueDate ? new Date(debtDueDate) : null,
          settledAt: null,
        });
      }

      const itemRecords: TransactionItemRecord[] = cart.map(c => ({
        transactionId: txId as number,
        productId: c.product.id!,
        productName: c.product.name,
        quantity: c.qty,
        price: unitPrice(c.product, c.qty, c.tierName),
        hpp: c.product.hpp,
        discountType: c.discountType,
        discountValue: c.discountValue,
        discountAmount: getItemDiscountAmount(c),
        subtotal: getItemSubtotal(c),
        notes: c.notes,
      }));
      await db.transactionItems.bulkAdd(itemRecords);

      for (const item of cart) {
        if (!isStockManaged(item.product)) continue;
        await db.products.update(item.product.id!, { stock: item.product.stock - item.qty, updatedAt: new Date() });
      }

      toast.success(t('cashier.toast.transactionSuccess', { receiptNumber }));
      trackEvent('create_transaction');
      setLastTransaction({ ...txData, id: txId as number });
      setLastTxItems(itemRecords);
      setReceiptOpen(true);
    }

    doFullReset();
    setCheckoutOpen(false);
    setCartOpen(false);
  };

  const cartCount = cart.reduce((s, c) => s + c.qty, 0);
  const openBillsCount = openBills?.length ?? 0;

  /**
   * Denah meja untuk mode restoran.
   *
   * Meja sengaja tidak jadi entitas database tersendiri: nomornya dibangun dari
   * `tableCount` dan statusnya diturunkan dari bill yang masih terbuka. Dengan
   * begitu tidak ada data meja yang bisa melenceng dari kenyataan transaksi.
   */
  /**
   * Sisa kasbon pelanggan yang sedang dipilih. Ditampilkan sebelum transaksi
   * dimulai supaya mencegah kerugian, bukan sekadar melaporkannya.
   */
  const customerDebts = useLiveQuery(
    async () => customerId == null ? [] : db.debts.where('customerId').equals(customerId).toArray(),
    [customerId],
  );
  const customerDebtTotal = (customerDebts ?? []).reduce((sum, d) => sum + d.remainingAmount, 0);

  const tableCount = storeSettings?.tableCount ?? 0;
  const tableSlots = useMemo(
    () => (traits.tables ? deriveTableSlots(openBills, tableCount, Date.now()) : []),
    [traits.tables, tableCount, openBills],
  );

  /**
   * Tandai / batalkan permintaan bill dari sebuah meja.
   *
   * Ini aksi pelayan, bukan kasir: pelayan yang dipanggil meja menandainya dari
   * daftar bill, lalu kasir melihatnya menyala di denah meja. Tanpa aksi ini
   * statusnya tidak akan pernah terisi dan warnanya cuma jadi hiasan.
   */
  const toggleBillRequest = async (bill: Transaction) => {
    if (!bill.id) return;
    const requested = !bill.billRequestedAt;
    await db.transactions.update(bill.id, {
      billRequestedAt: requested ? new Date() : null,
      updatedAt: new Date(),
    });
    toast.success(requested
      ? t('cashier.tables.requestMarked', { number: bill.tableNumber ?? bill.receiptNumber })
      : t('cashier.tables.requestCleared', { number: bill.tableNumber ?? bill.receiptNumber }));
  };

  /**
   * Meja kosong → mulai bill baru dengan nomor itu. Meja terisi → lanjutkan
   * bill yang sudah ada, karena itulah yang hampir selalu dimaksud.
   */
  /**
   * Denah meja hanya menghadang saat belum ada yang dikerjakan. Begitu keranjang
   * terisi, sedang menyunting bill, atau pilih order bungkus, layar kembali ke
   * menu supaya tidak menghalangi.
   */
  const showTablePicker =
    tableSlots.length > 0 && !takeAwayMode && cart.length === 0 && !editingTxId && !tableNumber;

  /** Buka sheet pembayaran, opsional langsung dalam mode tempo/kasbon. */
  const openCheckout = (asDebt: boolean) => {
    setCheckoutOpen(true);
    setUseDebt(asDebt);
    setPaymentMethodId(paymentMethods?.[0]?.id?.toString() ?? '');
    setPaymentAmount(asDebt ? '0' : total.toString());
    setIsQuickAdding(false);
  };

  const showTempoAction = traits.emphasizeDebt && !!storeSettings?.allowDebt;

  const handleSelectTable = (table: TableSlot) => {
    if (table.occupied) {
      const bill = (openBills ?? []).find(b => (b.tableNumber ?? '').trim() === table.number);
      if (bill) { void loadOpenBill(bill); return; }
    }
    doFullReset();
    setTableNumber(table.number);
    setOpenBillsOpen(false);
    toast.success(t('cashier.tables.started', { number: table.number }));
  };

  const handleScan = (barcode: string) => {
    setScannerOpen(false);
    const product = products?.find(p => p.sku === barcode || p.barcode === barcode);
    if (product) {
      if (isStockManaged(product) && product.stock <= 0) {
        toast.error(t('cashier.toast.productOutOfStock', { name: product.name }));
        return;
      }
      addToCart(product);
      toast.success(t('cashier.toast.addedToCart', { name: product.name }));
    } else {
      toast.error(t('cashier.toast.productNotFound', { code: barcode }));
    }
  };

  // Search input doubles as the scanner-gun field: Enter on an exact
  // SKU/barcode match adds the product and clears; otherwise the text
  // stays as a plain name filter.
  const handleScanKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && search.trim()) {
      const code = search.trim();
      const product = products?.find(p => p.sku === code || p.barcode === code);
      if (!product) return;
      setSearch('');
      if (isStockManaged(product) && product.stock <= 0) {
        toast.error(t('cashier.toast.productOutOfStock', { name: product.name }));
        return;
      }
      addToCart(product);
      toast.success(t('cashier.toast.addedToCart', { name: product.name }));
    }
  };

  // Open the Open Bills sheet when navigated here from the dashboard
  useEffect(() => {
    if ((location.state as { openBills?: boolean } | null)?.openBills) {
      setOpenBillsOpen(true);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location, navigate]);

  // Load a specific open bill when navigated from Riwayat's OrderCard CTA
  useEffect(() => {
    const billId = (location.state as { loadBillId?: number } | null)?.loadBillId;
    if (billId && openBills) {
      const tx = openBills.find(b => b.id === billId);
      if (tx) void loadOpenBill(tx);
      navigate(location.pathname, { replace: true, state: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state, openBills]);

  // After all hooks: if user can't create transactions, render the locked
  // placeholder instead of the kasir UI. Bottom nav stays visible.
  if (!allowed) {
    return <LockedPage title={t('cashier.locked.title')} permissionLabel={t('cashier.locked.permissionLabel')} />;
  }

  return (
    // Tinggi dihitung sendiri karena grid produk & panel keranjang punya
    // scroll masing-masing. `dvh` (bukan `vh`) supaya toolbar browser mobile
    // yang muncul-hilang tidak memotong bagian bawah grid; safe area & tinggi
    // BottomNav diambil dari variabel di index.css, bukan angka tebakan.
    <div className="flex h-[calc(100dvh-var(--app-nav-h)-var(--app-safe-top)-var(--app-safe-bottom))] flex-col">
      {/* === Tata bahasa dompet ===
          Total berjalan adalah OBJEK layar ini, bukan keterangan yang muncul
          belakangan. Sebelumnya ia bersembunyi di bar mengambang yang hanya
          lahir setelah keranjang terisi — artinya sepanjang pemilik memilih
          barang, angka yang paling ingin ia lihat justru tidak ada. Sekarang
          ia berdiri di puncak layar sejak ketukan pertama, dicelup penuh
          warna brand, dan tidak pernah tergulir keluar. */}
      <MoneyPanel variant="screen" className="shrink-0 md:rounded-none">
        <PageHeader
          tone="dipped"
          className="mb-2"
          title={
            <>
              {t('cashier.title')}
              {editingTxId && (
                <Badge variant="secondary" className="ml-2 align-middle text-xs font-normal">
                  {t('cashier.editingBill')}
                </Badge>
              )}
            </>
          }
          subtitle={storeSettings?.storeName || undefined}
          onBack={() => navigate('/')}
        >
          <Button
            variant="on-brand"
            size="icon-sm"
            onClick={() => setOpenBillsOpen(true)}
            aria-label={`${t('cashier.openBill')}${openBillsCount > 0 ? ` (${openBillsCount})` : ''}`}
          >
            <ClipboardList />
            {openBillsCount > 0 && (
              <Badge variant="warning" size="sm" pill className="absolute -right-1.5 -top-1.5 h-4.5 min-w-4.5 px-1 text-2xs tabular-nums">
                {openBillsCount}
              </Badge>
            )}
          </Button>
        </PageHeader>

        <MoneyPanelLabel>{t('cashier.totalLabel', { defaultValue: 'Total belanja' })}</MoneyPanelLabel>
        <MoneyPanelAmount value={total} alwaysVisible />

        <MoneyPanelFooter>
          <span className="min-w-0 truncate">
            <b className="font-bold text-primary-foreground">
              {t('cashier.cart.title', { count: cartCount })}
            </b>
          </span>
          {cartCount > 0 && (
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="inline-flex shrink-0 items-center gap-0.5 rounded-sm font-bold text-primary-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-primary-foreground/50 md:hidden"
            >
              {t('cashier.cart.view', { defaultValue: 'Lihat keranjang' })}
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </MoneyPanelFooter>
      </MoneyPanel>

      <div className="flex min-h-0 flex-1 flex-col gap-0 px-4 pt-3 md:flex-row md:gap-4">
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">

          {/* Grosir: pelanggan dipilih di awal, bukan di akhir — limit kasbonnya
              perlu terlihat sebelum transaksi dimulai, bukan sesudah. */}
          {traits.prominentCustomer && (
            <div className="md:hidden mb-3">
              <CustomerPicker
                customers={customers ?? []}
                value={customerName}
                customerId={customerId}
                onChange={(name, id) => { setCustomerName(name); setCustomerId(id); }}
              />
              {customerId != null && customerDebtTotal > 0 && (
                <p className="mt-1.5 text-xs font-medium text-warning-text">
                  {t('cashier.customerDebt', { amount: rp(customerDebtTotal) })}
                </p>
              )}
            </div>
          )}

          {/* Search — also the scanner-gun field (Enter on exact SKU/barcode adds to cart) */}
          <div className="flex gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('cashier.searchPlaceholder')}
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={handleScanKeyDown}
                className="pl-8"
              />
            </div>
            {/* Tombol suara hanya muncul kalau perangkat memang bisa
                mengenali suara sendiri — menawarkannya lalu gagal saat ditekan
                lebih buruk daripada tidak menawarkannya sama sekali. */}
            {voice.available && (
              <Button
                variant="outline"
                size="icon"
                aria-label={t('cashier.voice.page.title')}
                onClick={openVoicePage}
                disabled={voice.starting}
                className="relative"
              >
                <Mic />
                {!voiceQuota.quota.unlimited && (
                  <span
                    className={cn(
                      /* Di DALAM tombol, bukan digantung di luarnya: baris
                         ini berdiri di puncak wadah yang menggulir, jadi apa
                         pun yang menjorok ke atas akan terpotong. */
                      'absolute right-0.5 top-0.5 min-w-4.5 rounded-full px-1 text-3xs font-bold leading-[18px] tabular-nums',
                      voiceQuota.quota.remaining > 0 ? 'bg-secondary text-muted-foreground' : 'bg-warning text-warning-foreground',
                    )}
                    title={t('cashier.voice.quota.remaining', { remaining: voiceQuota.quota.remaining, limit: voiceQuota.quota.limit })}
                  >
                    {voiceQuota.quota.remaining}
                  </span>
                )}
              </Button>
            )}
            {traits.barcode && (
              <Button variant="outline" size="icon" aria-label={t('cashier.buttons.scanBarcode')} onClick={() => setScannerOpen(true)}>
                <ScanBarcode />
              </Button>
            )}
          </div>

          {/* Mikrofon yang padam sendiri WAJIB memberi alasan dan jalan
              kembali. Tanpa ini kasir cuma melihat suaranya berhenti bekerja,
              tanpa tahu kenapa dan tanpa tahu harus berbuat apa. */}
          {voice.error && !voicePageOpen && (
            <div className="mb-3 flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/10 px-3 py-2">
              <p className="flex-1 text-2xs leading-relaxed text-warning-text">
                {t(voice.denied ? 'cashier.voice.denied' : `cashier.voice.error.${voice.error}`)}
              </p>
              {!voice.denied && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 shrink-0 gap-1 text-2xs"
                  onClick={openVoicePage}
                >
                  <Mic className="h-3 w-3" />
                  {t('cashier.voice.retry')}
                </Button>
              )}
            </div>
          )}

          {/* Pita kategori. Titik warna di kiri label adalah jembatan sistem
              pengenal: warna yang sama muncul di thumbnail produk dan ubin
              menu Beranda, jadi kategori bisa dikenali sebelum sempat
              dibaca. Chip aktif dicelup brand penuh — di layar yang dipakai
              ratusan kali sehari, status terpilih harus terbaca dari sudut
              mata, bukan dari pil abu di atas bidang abu.

              Emoji `c.icon` sengaja tidak ikut ke label: posisi itu milik
              titik warna, dan ikon yang diketik user tidak punya bobot,
              ukuran, atau kontras yang bisa dijamin. */}
          <CategoryStrip className="mb-3">
            <CategoryChip
              active={filterCategory === 'all'}
              onClick={() => setFilterCategory('all')}
            >
              {t('cashier.categoryAll')}
            </CategoryChip>
            {(categories ?? []).map(c => (
              <CategoryChip
                key={c.id}
                tone={toneForId(c.id)}
                active={filterCategory === c.id!.toString()}
                onClick={() => setFilterCategory(c.id!.toString())}
              >
                {c.name}
              </CategoryChip>
            ))}
          </CategoryStrip>

          {/* Restoran masuk lewat meja, bukan lewat menu: sebelum ada yang
              dipesan, yang perlu dijawab adalah "meja mana", bukan "menu apa". */}
          {showTablePicker ? (
            <div className="flex-1 overflow-y-auto scrollbar-hide">
              <TableGrid
                tables={tableSlots}
                onSelect={handleSelectTable}
                formatMoney={rp}
                emptyLabel={t('cashier.tables.empty')}
                requestedLabel={t('cashier.tables.requested')}
              />
              <div className="mt-3 flex flex-wrap gap-3 text-2xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm border border-border bg-card" />{t('cashier.tables.empty')}</span>
                <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-primary" />{t('cashier.tables.busy')}</span>
                <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-warning" />{t('cashier.tables.requested')}</span>
              </div>
              <Button variant="outline" className="mt-4 w-full" onClick={() => setTakeAwayMode(true)}>
                <Plus />
                {t('cashier.tables.takeAway')}
              </Button>
            </div>
          ) : (
          <div className={cn('flex-1 overflow-y-auto scrollbar-hide', cartCount > 0 && 'pb-24 md:pb-0')}>
            {filtered.length === 0 ? (
              <EmptyState
                icon={PackageIcon}
                title={products && products.length > 0 ? t('cashier.empty.outOfStock') : t('cashier.empty.noProducts')}
              />
            ) : layoutMode === 'rows' ? (
              <div className="space-y-2 pb-2">
                {filtered.map(p => {
                  const inCartQty = cart.find(c => c.product.id === p.id)?.qty ?? 0;
                  return (
                    <Item
                      key={p.id}
                      asChild
                      interactive
                      className={cn('active:scale-[0.99]', isStockManaged(p) && p.stock <= 0 && 'opacity-60')}
                    >
                      <button type="button" onClick={() => addToCart(p)}>
                        {/* Warna kategori yang sama dengan cabang kisi di
                            layar ini — satu layar tidak boleh menjalankan
                            dua tata bahasa warna. */}
                        <ItemMedia
                          className={cn(
                            'relative overflow-visible',
                            !p.photo && TONE_SURFACE[p.categoryId != null ? toneForId(p.categoryId) : toneForName(p.name)],
                          )}
                        >
                          {p.photo ? (
                            <img src={p.photo} alt="" className="rounded-xl" />
                          ) : (
                            <span className="text-xsm font-extrabold tracking-[-0.02em]">
                              {p.name.slice(0, 2).toUpperCase()}
                            </span>
                          )}
                          {inCartQty > 0 && (
                            <Badge size="sm" pill className="absolute -right-1.5 -top-1.5 h-4.5 min-w-4.5 px-1 text-2xs tabular-nums">
                              {inCartQty}
                            </Badge>
                          )}
                        </ItemMedia>
                        <ItemContent>
                          <ItemTitle>{p.name}</ItemTitle>
                          <ItemDescription>
                            {isStockManaged(p)
                              ? t('cashier.productCard.stock', { stock: p.stock, unit: p.unit })
                              : t('cashier.productCard.alwaysAvailable')}
                          </ItemDescription>
                        </ItemContent>
                        <span className="shrink-0 text-sm font-semibold tabular-nums">{rp(p.price)}</span>
                      </button>
                    </Item>
                  );
                })}
              </div>
            ) : (
              /* Tiga kolom di HP, bukan dua: sel yang lebih rapat membuat
                 sembilan barang muat dalam satu layar, dan di warung urutan
                 barang laris dihafal berdasarkan posisinya. Barang tanpa
                 foto memakai inisial di atas tint kategorinya — warna yang
                 sama dengan ubin menu dan pita kategori — supaya kisinya
                 tetap bisa dipindai tanpa satu pun foto produk, yang memang
                 keadaan sebagian besar warung. */
              <div className="grid grid-cols-3 gap-2 md:grid-cols-4 lg:grid-cols-5">
                {filtered.map(p => {
                  const inCartQty = cart.find(c => c.product.id === p.id)?.qty ?? 0;
                  const managed = isStockManaged(p);
                  const outOfStock = managed && p.stock <= 0;
                  const lowStock = managed && !outOfStock && p.stock <= 5;
                  // ID kategori, bukan hash nama: ID-nya berurut sehingga enam
                  // kategori pertama dijamin berbeda warna. Hash nama hanya
                  // dipakai untuk barang yang belum berkategori.
                  const tone = p.categoryId != null ? toneForId(p.categoryId) : toneForName(p.name);
                  return (
                    <Card
                      key={p.id}
                      className={cn(
                        'relative text-left transition-transform active:scale-[0.975]',
                        'motion-reduce:transition-none motion-reduce:active:scale-100',
                        outOfStock && 'opacity-60',
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => addToCart(p)}
                        disabled={outOfStock}
                        className="block w-full rounded-xl p-2 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:cursor-not-allowed"
                      >
                        <div className={cn('relative flex h-16 items-center justify-center overflow-hidden rounded-md', !p.photo && TONE_SURFACE[tone])}>
                          {p.photo ? (
                            <img src={p.photo} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-heading font-extrabold tracking-[-0.02em]">
                              {p.name.slice(0, 2).toUpperCase()}
                            </span>
                          )}
                          {/* Badge jumlah duduk DI DALAM thumbnail. Digantung
                              di luar kartu, kolom ketiga terpotong tepi layar:
                              kolom itu berdiri tepat di batas padding halaman,
                              jadi tidak ada ruang untuk digantungi. */}
                          {inCartQty > 0 && (
                            <span className="absolute right-1 top-1 min-w-[1.4rem] rounded-full bg-primary px-1.5 text-center text-2xs font-extrabold leading-[1.25rem] tabular-nums text-primary-foreground">
                              {inCartQty}
                            </span>
                          )}
                        </div>
                        <p className="mt-1.5 line-clamp-2 min-h-[2.1rem] text-2xs font-semibold leading-tight tracking-[-0.01em]">
                          {p.name}
                        </p>
                        <p className="mt-0.5 text-xsm font-bold tabular-nums">{rp(p.price)}</p>
                        <p
                          className={cn(
                            'text-2xs tabular-nums',
                            outOfStock ? 'font-bold text-destructive-text' : lowStock ? 'font-semibold text-warning-text' : 'font-medium text-faint-foreground',
                          )}
                        >
                          {managed
                            ? outOfStock
                              ? t('summary.outOfStock', { ns: 'products', defaultValue: 'Habis' })
                              : t('cashier.productCard.stock', { stock: p.stock, unit: p.unit })
                            : t('cashier.productCard.alwaysAvailable')}
                        </p>
                      </button>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
          )}
        </div>

        {/* Desktop Cart Panel */}
        <Card className="hidden md:flex md:w-80 lg:w-96 flex-col overflow-hidden shrink-0">
          <div className="p-4 border-b border-border shrink-0">
            <h3 className="text-base font-semibold flex items-center gap-2">
              {t('cashier.cart.title', { count: cartCount })}
              {editingTxId && <span className="text-xs font-normal text-muted-foreground">{t('cashier.cart.editLabel')}</span>}
            </h3>
          </div>
          {cart.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <p className="text-sm text-muted-foreground">{t('cashier.cart.empty')}</p>
            </div>
          ) : (
            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto space-y-2 p-4">
                <CartItems
                  cart={cart}
                  t={t}
                  rp={rp}
                  editingItemNotes={editingItemNotes}
                  tempItemNotes={tempItemNotes}
                  onTempItemNotesChange={setTempItemNotes}
                  onEditingItemNotesChange={setEditingItemNotes}
                  onUpdateQty={updateQty}
                  onRemove={removeFromCart}
                  onSetQty={setItemQty}
                  onSaveNotes={updateItemNotes}
                  onOpenDiscount={openItemDiscount}
                  getItemDiscountAmount={getItemDiscountAmount}
                  getItemSubtotal={getItemSubtotal}
                />
              </div>

              <div className="px-4 pb-3">
                <CustomerTableInputs
                  customers={customers ?? []}
                  customerName={customerName}
                  customerId={customerId}
                  onCustomerChange={(name, id) => { setCustomerName(name); setCustomerId(id); }}
                  tableNumber={tableNumber}
                  onTableNumberChange={setTableNumber}
                  t={t}
                />
              </div>

              <div className="border-t px-4 py-4">
                <CartSummary
                  t={t}
                  rp={rp}
                  subtotal={subtotal}
                  total={total}
                  txDiscountType={txDiscountType}
                  txDiscountValue={txDiscountValue}
                  txDiscountAmount={txDiscountAmount}
                  isCartEmpty={cart.length === 0}
                  isEditingBill={!!editingTxId}
                  canCancelBill={can('delete_transaction')}
                  onEditDiscount={() => { setTempDiscountType(txDiscountType ?? 'nominal'); setTempDiscountValue(txDiscountValue); setDiscountDialogOpen(true); }}
                  onSaveBill={() => setSaveConfirmOpen(true)}
                  onPay={() => { setCheckoutOpen(true); setUseDebt(false); setPaymentMethodId(paymentMethods?.[0]?.id?.toString() ?? ''); setPaymentAmount(total.toString()); setIsQuickAdding(false); }}
                  onCancelBill={handleCancelFromCart}
                />
              </div>
            </div>
          )}
        </Card>
      </div>{/* end flex row */}

      {/* === Baris aksi di garis jempol ===
          Pasangan dari panel dompet di puncak layar. Ia tidak lagi
          mengambang di atas konten: bar mengambang menutupi baris produk
          paling bawah persis saat keranjang penuh, yaitu saat daftar itu
          paling panjang. Sekarang ia duduk di dasar layar sebagai baris
          tebal penuh lebar, dan kisi produk berhenti tepat di atasnya.

          Nominal ikut di tombol karena itu yang dikonfirmasi orang sesaat
          sebelum menerima uang — angka di puncak layar dipakai untuk
          memantau, angka di tombol dipakai untuk memutuskan. */}
      {/* Dirender sejak keranjang masih kosong, dalam keadaan nonaktif.
          Memunculkannya baru setelah ada isi adalah pola chrome-yang-muncul
          yang sama, yang sudah ditolak untuk total di puncak layar: tata
          letaknya melompat tepat saat barang pertama masuk, dan kisi produk
          kehilangan dasar yang tetap. */}
      <ActionBar className="md:hidden">
          {/* Di grosir, jual tempo itu normal — bukan pengecualian.
              Menyembunyikannya sebagai opsi kecil membuat pemilik mencatat
              di buku terpisah dan datanya hilang dari aplikasi. */}
        {showTempoAction && cartCount > 0 && (
          <Button variant="outline" size="lg" className="mb-2 w-full" onClick={() => openCheckout(true)}>
            <Clock />
            {t('cashier.checkout.payLater')}
          </Button>
        )}
        <ActionButton
          onClick={() => openCheckout(false)}
          disabled={cartCount === 0}
          label={showTempoAction ? t('cashier.checkout.payFull') : t('cashier.buttons.pay')}
          amount={cartCount > 0 ? rp(total) : undefined}
        />
      </ActionBar>

      <AlertDialog open={voiceUpsellOpen} onOpenChange={setVoiceUpsellOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('cashier.voice.quota.exhaustedTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('cashier.voice.quota.exhaustedBody', { limit: voiceQuota.quota.limit })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cashier.voice.quota.later')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                closeVoicePage();
                navigate('/settings/cloud-backup');
              }}
            >
              {t('cashier.voice.quota.seePlans')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {voicePageOpen && (
        <VoiceCartPage
          dictation={voice}
          quota={voiceQuota.quota}
          cart={cart}
          total={total}
          rp={rp}
          unitPriceOf={itemUnitPrice}
          subtotalOf={getItemSubtotal}
          onUpdateQty={updateQty}
          onRemove={removeWithUndo}
          onClear={clearWithUndo}
          onClose={closeVoicePage}
          onPay={() => { closeVoicePage(); openCheckout(false); }}
          onSearchManual={closeVoicePage}
        />
      )}

      {/* Cart Sheet (mobile only) */}
      <div className="md:hidden">
        <Sheet open={cartOpen} onOpenChange={(open) => { setCartOpen(open); if (!open) setEditingItemNotes(null); }}>
          <SheetContent side="bottom" className="h-[85vh] max-w-lg mx-auto pt-3">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-input" aria-hidden="true" />
            <SheetHeader>
              <SheetTitle className="text-left">
                {t('cashier.cart.title', { count: cartCount })}
                {editingTxId && <span className="text-xs font-normal text-muted-foreground ml-2">{t('cashier.cart.editOpenBillLabel')}</span>}
              </SheetTitle>
            </SheetHeader>
            <div className="flex flex-col h-full mt-3">
              <div className="flex-1 overflow-y-auto space-y-2 pb-4">
                <CartItems
                  cart={cart}
                  t={t}
                  rp={rp}
                  editingItemNotes={editingItemNotes}
                  tempItemNotes={tempItemNotes}
                  onTempItemNotesChange={setTempItemNotes}
                  onEditingItemNotesChange={setEditingItemNotes}
                  onUpdateQty={updateQty}
                  onRemove={removeFromCart}
                  onSetQty={setItemQty}
                  onSaveNotes={updateItemNotes}
                  onOpenDiscount={openItemDiscount}
                  getItemDiscountAmount={getItemDiscountAmount}
                  getItemSubtotal={getItemSubtotal}
                />
              </div>

              {/* Customer / Table quick inputs */}
              <div className="pb-3">
                <CustomerTableInputs
                  customers={customers ?? []}
                  customerName={customerName}
                  customerId={customerId}
                  onCustomerChange={(name, id) => { setCustomerName(name); setCustomerId(id); }}
                  tableNumber={tableNumber}
                  onTableNumberChange={setTableNumber}
                  t={t}
                />
              </div>

              {/* Summary */}
              <div className="border-t border-border pt-3 pb-6">
                <CartSummary
                  t={t}
                  rp={rp}
                  subtotal={subtotal}
                  total={total}
                  txDiscountType={txDiscountType}
                  txDiscountValue={txDiscountValue}
                  txDiscountAmount={txDiscountAmount}
                  isCartEmpty={cart.length === 0}
                  isEditingBill={!!editingTxId}
                  canCancelBill={can('delete_transaction')}
                  onEditDiscount={() => { setTempDiscountType(txDiscountType ?? 'nominal'); setTempDiscountValue(txDiscountValue); setDiscountDialogOpen(true); }}
                  onSaveBill={() => setSaveConfirmOpen(true)}
                  onPay={() => { setCheckoutOpen(true); setUseDebt(false); setPaymentMethodId(paymentMethods?.[0]?.id?.toString() ?? ''); setPaymentAmount(total.toString()); setIsQuickAdding(false); }}
                  onCancelBill={handleCancelFromCart}
                />
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>{/* end mobile cart wrapper */}

      {/* Open Bills Sheet */}
      <Sheet open={openBillsOpen} onOpenChange={setOpenBillsOpen}>
        <SheetContent side="bottom" className="h-[80vh] max-w-lg md:max-w-xl mx-auto flex flex-col pt-3">
          <div className="mx-auto mb-3 h-1 w-10 shrink-0 rounded-full bg-input" aria-hidden="true" />
          <SheetHeader>
            <SheetTitle className="text-left">
              {t('cashier.openBillsSheet.title', { count: openBillsCount })}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-3 flex-1 min-h-0 overflow-y-auto pb-6 space-y-2">
            {tableSlots.length > 0 && (
              <div className="pb-2">
                <TableGrid
                  tables={tableSlots}
                  onSelect={handleSelectTable}
                  formatMoney={rp}
                  emptyLabel={t('cashier.tables.empty')}
                  requestedLabel={t('cashier.tables.requested')}
                />
                <div className="mt-2.5 flex flex-wrap gap-3 text-2xs text-muted-foreground">
                  <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm border border-border bg-card" />{t('cashier.tables.empty')}</span>
                  <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-primary" />{t('cashier.tables.busy')}</span>
                  <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-warning" />{t('cashier.tables.requested')}</span>
                </div>
              </div>
            )}
            {!openBills || openBills.length === 0 ? (
              <EmptyState icon={ClipboardList} title={t('cashier.openBillsSheet.empty')} />
            ) : (
              openBills.map(bill => (
                <Card key={bill.id} >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">{bill.receiptNumber}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {bill.openedAt ? format(new Date(bill.openedAt), 'dd/MM HH:mm', { locale: dateLocale }) : ''}
                        </span>
                      </div>
                      <span className="text-sm font-semibold tabular-nums">{rp(bill.total)}</span>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mb-3">
                      {bill.customerName && (
                        <span className="inline-flex items-center gap-1">
                          <User className="w-3.5 h-3.5" />
                          {bill.customerName}
                        </span>
                      )}
                      {bill.tableNumber && (
                        <span className="inline-flex items-center gap-1">
                          <Hash className="w-3.5 h-3.5" />
                          {t('cashier.openBillsSheet.tablePrefix', { number: bill.tableNumber })}
                        </span>
                      )}
                      {bill.remarks && (
                        <span className="inline-flex items-center gap-1 min-w-0">
                          <FileText className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate max-w-[160px]">{bill.remarks}</span>
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button className="flex-1" onClick={() => loadOpenBill(bill)}>
                        {t('cashier.openBillsSheet.continue')}
                      </Button>
                      {/* Aksi pelayan: menandai meja yang memanggil, supaya kasir
                          melihatnya menyala di denah meja. */}
                      {traits.tables && bill.tableNumber && (
                        <Button
                          size="icon"
                          variant="outline"
                          aria-label={t('cashier.tables.requested')}
                          aria-pressed={!!bill.billRequestedAt}
                          className={cn(
                            bill.billRequestedAt
                              ? 'border-warning bg-warning/10 text-warning-text hover:bg-warning/10'
                              : 'border-border text-muted-foreground',
                          )}
                          onClick={() => { void toggleBillRequest(bill); }}
                        >
                          <HandCoins className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="outline"
                        aria-label={t('cashier.buttons.printKitchen')}
                        className="border-primary/30 text-primary hover:bg-primary/5"
                        onClick={async () => {
                          const items = await db.transactionItems.where('transactionId').equals(bill.id!).toArray();
                          setKitchenTicketTx(bill);
                          setKitchenTicketItems(items);
                          setKitchenTicketOpen(true);
                        }}
                      >
                        <Printer className="w-4 h-4" />
                      </Button>
                      {can('delete_transaction') && (
                        <Button
                          size="icon"
                          variant="outline"
                          aria-label={t('cashier.openBillsSheet.cancel')}
                          className="text-destructive-text border-destructive/30 hover:bg-destructive/5"
                          onClick={() => handleCancelFromList(bill)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Checkout — bottom sheet: daftar item, rincian, metode bayar, uang diterima */}
      <Sheet open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <SheetContent side="bottom" className="max-w-lg md:max-w-xl mx-auto max-h-[92vh] flex flex-col p-0 overflow-hidden">
          <div className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-input" aria-hidden="true" />
          <SheetHeader className="px-4 pt-3 pb-1 shrink-0">
            <SheetTitle className="text-left">{t('cashier.checkout.title')}</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
            {cart.length > 0 && (
              <div className="space-y-2">
                {cart.map(item => {
                  const tiers = tiersOf(item.product);
                  const activeTier = resolveTier(item.product, item.qty, item.tierName);
                  return (
                    <Item key={item.product.id} className="flex-wrap">
                      <ItemMedia tone="muted">
                        {item.product.photo ? <img src={item.product.photo} alt="" /> : <PackageIcon />}
                      </ItemMedia>
                      <ItemContent>
                        <ItemTitle>{item.product.name}</ItemTitle>
                        <ItemDescription className="tabular-nums">{rp(itemUnitPrice(item))} × {item.qty}</ItemDescription>
                      </ItemContent>
                      <ItemActions>
                        <QtyStepper
                          size="sm"
                          value={item.qty}
                          min={1}
                          onChange={next => updateQty(item.product.id!, next - item.qty)}
                          aria-label={item.product.name}
                        />
                      </ItemActions>
                      {tiers.length > 1 && (
                        <PriceTierSeg
                          className="ml-[52px] w-full"
                          tiers={tiers}
                          qty={item.qty}
                          value={activeTier.name}
                          baseLabel={t('cashier.priceTier.base')}
                          onChange={tierName => setItemTier(item.product.id!, tierName)}
                        />
                      )}
                    </Item>
                  );
                })}
              </div>
            )}

            <DataList>
              <DataListRow label={t('cashier.cartDiscount.subtotal')} value={rp(subtotal)} />
              {txDiscountAmount > 0 && (
                <DataListRow label={t('cashier.cartDiscount.discount')} value={`-${rp(txDiscountAmount)}`} valueClassName="text-destructive-text" />
              )}
              <DataListRow total label={t('cashier.checkout.totalLabel')} value={rp(total)} valueClassName="text-lg" />
            </DataList>

            {storeSettings?.allowDebt && (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 shadow-xs">
                <div>
                  <p className="text-sm font-medium">{t('cashier.checkout.debtLabel')}</p>
                  <p className="text-xs text-muted-foreground">{t('cashier.checkout.debtDesc')}</p>
                </div>
                <Switch
                  checked={useDebt}
                  onCheckedChange={(checked) => {
                    setUseDebt(checked);
                    setPaymentAmount(checked ? '0' : total.toString());
                    setIsQuickAdding(false);
                  }}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>{t('cashier.checkout.paymentMethod')}</Label>
              {/* Toggle group: kotak bergaris, aktif = bg-accent + border foreground */}
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t('cashier.checkout.paymentMethod')}>
                {paymentMethods?.map(pm => {
                  const active = paymentMethodId === pm.id!.toString();
                  return (
                    <button
                      key={pm.id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setPaymentMethodId(pm.id!.toString())}
                      className={cn(
                        'h-9 rounded-lg border px-3 text-xsm font-medium shadow-xs transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30',
                        active ? 'border-foreground bg-accent text-foreground' : 'border-input bg-transparent text-muted-foreground hover:text-foreground dark:bg-input/30',
                      )}
                    >
                      {pm.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Uang diterima — pecahan cepat + keypad sendiri.
                Keyboard sistem menutup nominal kembalian, padahal justru itu
                yang dicari kasir saat antrean panjang. */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{useDebt ? t('cashier.checkout.amountLabel.debt') : t('cashier.checkout.amountLabel.full')}</Label>
                <Button
                  variant="link"
                  size="xs"
                  onClick={() => { setPaymentAmount('0'); setIsQuickAdding(false); }}
                  className="text-muted-foreground hover:text-destructive-text"
                >
                  {t('cashier.checkout.reset')}
                </Button>
              </div>

              {/* Nominal diisi lewat keypad di bawah, jadi ini tampilan
                  bergaya input besar — bukan input sistem yang memunculkan keyboard. */}
              <div className="flex h-11 items-center gap-2 rounded-lg border border-input bg-transparent px-3 shadow-xs dark:bg-input/30" aria-live="polite">
                <span className="text-sm text-muted-foreground">{currencySymbol}</span>
                <span className="flex-1 text-xl font-semibold tabular-nums">
                  {(Number(paymentAmount) || 0).toLocaleString(numberLocale)}
                </span>
              </div>

              {!useDebt && (
                <QuickCashRow
                  total={total}
                  locale={numberLocale}
                  exactLabel={t('cashier.checkout.exactMoney')}
                  onPick={amount => { setPaymentAmount(String(amount)); setIsQuickAdding(false); }}
                />
              )}

              <NumPad
                value={paymentAmount === '' ? '0' : paymentAmount}
                onChange={next => { setPaymentAmount(next); setIsQuickAdding(true); }}
              />
            </div>

            <div className="space-y-2">
              <div className="flex gap-2">
                <CustomerPicker
                  customers={customers ?? []}
                  value={customerName}
                  customerId={customerId}
                  onChange={(name, id) => { setCustomerName(name); setCustomerId(id); }}
                  className="flex-1"
                />
                {/* Nomor meja hanya relevan untuk restoran; di warung & grosir
                    kolom ini cuma menambah kebisingan. */}
                {traits.tables && (
                  <div className="relative flex-[0.7]">
                    <Hash className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      placeholder={t('cashier.checkout.table')}
                      value={tableNumber}
                      onChange={e => setTableNumber(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                )}
              </div>
              <Input
                placeholder={t('cashier.checkout.notes')}
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
              />
            </div>

            {/* Tenggat disepakati di depan pembeli, saat itu juga. Kasbon tanpa
                tenggat tetap boleh — ia hanya tidak akan pernah dianggap telat. */}
            {useDebt && debtAmount > 0 && (
              <div className="space-y-2">
                <Label>{t('cashier.checkout.dueDateLabel')}</Label>
                <Input
                  type="date"
                  value={debtDueDate}
                  onChange={e => setDebtDueDate(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">{t('cashier.checkout.dueDateHint')}</p>
              </div>
            )}

            {useDebt && debtAmount > 0 && (
              <div className="flex items-center justify-between rounded-xl border border-warning/30 bg-warning/5 p-3">
                <div>
                  <p className="text-sm font-medium">{t('cashier.checkout.remainingDebt')}</p>
                  <p className="text-xs text-muted-foreground">{t('cashier.checkout.remainingDebtHint')}</p>
                </div>
                <span className="text-lg font-semibold tabular-nums text-warning-text">{rp(debtAmount)}</span>
              </div>
            )}

          </div>

          {/* Sticky footer: payment feedback + primary action always visible */}
          <div className="shrink-0 border-t border-border bg-popover px-4 py-3 space-y-3">
            {/* Kembalian adalah ketakutan nomor satu kasir — tampilkan sebesar
                mungkin, sebelum tombol selesai ditekan. */}
            {!useDebt && paidAmount >= total && (
              <div className="flex items-center justify-between px-0.5">
                <span className="text-sm text-muted-foreground">{t('cashier.checkout.changeLabel')}</span>
                <MoneyDisplay value={change} size="lg" symbol={currencySymbol} locale={numberLocale} alwaysVisible className="font-semibold text-success-text" />
              </div>
            )}
            {!useDebt && paidAmount > 0 && paidAmount < total && (
              <div className="flex items-center justify-between px-0.5">
                <span className="text-sm text-muted-foreground">{t('cashier.checkout.insufficient')}</span>
                <span className="text-base font-semibold text-warning-text tabular-nums">-{rp(total - paidAmount)}</span>
              </div>
            )}
            <Button
              size="xl"
              className="w-full"
              onClick={handleCheckout}
              disabled={
                useDebt
                  ? !customerId || paidAmount < 0 || paidAmount > total || (checkoutPaidAmount > 0 && !paymentMethodId)
                  : !paymentMethodId || paidAmount < total
              }
            >
              <Check />
              {t('cashier.buttons.pay')} {rp(total)}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Discount Dialog */}
      <Dialog open={discountDialogOpen} onOpenChange={setDiscountDialogOpen}>
        <DialogContent className="max-w-[95vw] rounded-2xl">
          <DialogHeader>
            <DialogTitle>{t('cashier.discountDialog.title')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>{t('cashier.discountDialog.typeLabel')}</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setTempDiscountType('nominal')}
                  className={cn('h-9 rounded-lg border px-3 text-xsm font-medium shadow-xs transition-colors', tempDiscountType === 'nominal' ? 'border-foreground bg-accent text-foreground' : 'border-input bg-transparent text-muted-foreground hover:text-foreground')}
                >
                  {t('cashier.discountDialog.type.nominal', { symbol: currencySymbol })}
                </button>
                <button
                  onClick={() => setTempDiscountType('percentage')}
                  className={cn('h-9 rounded-lg border px-3 text-xsm font-medium shadow-xs transition-colors', tempDiscountType === 'percentage' ? 'border-foreground bg-accent text-foreground' : 'border-input bg-transparent text-muted-foreground hover:text-foreground')}
                >
                  {t('cashier.discountDialog.type.percentage')}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{tempDiscountType === 'percentage' ? t('cashier.discountDialog.amountLabel.percentage') : t('cashier.discountDialog.amountLabel.nominal')}</Label>
              <Input
                type="number"
                value={tempDiscountValue}
                onChange={e => setTempDiscountValue(e.target.value)}
                placeholder={tempDiscountType === 'percentage' ? t('cashier.discountDialog.placeholder.percentage') : t('cashier.discountDialog.placeholder.nominal')}
                className="h-11 text-center text-xl font-semibold tabular-nums"
              />
              {tempDiscountType === 'percentage' && Number(tempDiscountValue) > 0 && (
                <p className="text-xs text-muted-foreground text-center">
                  {t('cashier.discountDialog.percentPreview', { symbol: currencySymbol, amount: (subtotal * Number(tempDiscountValue) / 100).toLocaleString(numberLocale), subtotal: subtotal.toLocaleString(numberLocale) })}
                </p>
              )}
            </div>

            <div className="flex gap-2">
              {txDiscountType && (
                <Button variant="outline" size="xl" className="text-destructive-text border-destructive/30" onClick={() => {
                  setTxDiscountType(null);
                  setTxDiscountValue('');
                  setDiscountDialogOpen(false);
                }}>
                  {t('cashier.discountDialog.delete')}
                </Button>
              )}
              <Button size="xl" className="flex-1" onClick={() => {
                if (Number(tempDiscountValue) > 0) {
                  setTxDiscountType(tempDiscountType);
                  setTxDiscountValue(tempDiscountValue);
                } else {
                  setTxDiscountType(null);
                  setTxDiscountValue('');
                }
                setDiscountDialogOpen(false);
              }}>
                {t('cashier.discountDialog.save')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Item Discount Dialog */}
      <Dialog open={itemDiscountTargetId !== null} onOpenChange={(open) => { if (!open) setItemDiscountTargetId(null); }}>
        <DialogContent className="max-w-[95vw] rounded-2xl">
          <DialogHeader>
            <DialogTitle>{t('cashier.itemDiscountDialog.title')}</DialogTitle>
          </DialogHeader>
          {(() => {
            const target = cart.find(c => c.product.id === itemDiscountTargetId);
            if (!target) return null;
            const base = unitPrice(target.product, target.qty, target.tierName) * target.qty;
            const rawValue = Number(itemDiscountValue) || 0;
            const previewAmount = itemDiscountType === 'percentage'
              ? base * Math.min(100, Math.max(0, rawValue)) / 100
              : Math.min(base, Math.max(0, rawValue));
            const exceedsCap = itemDiscountType === 'percentage' ? rawValue > 100 : rawValue > base;
            return (
              <div className="space-y-4 mt-2">
                <div className="rounded-xl border border-border bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">{t('cashier.itemDiscountDialog.itemLabel')}</p>
                  <p className="text-sm font-medium">{target.product.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {rp(unitPrice(target.product, target.qty, target.tierName))} × {target.qty} = {rp(base)}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>{t('cashier.itemDiscountDialog.typeLabel')}</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setItemDiscountType('nominal')}
                      className={cn('h-9 rounded-lg border px-3 text-xsm font-medium shadow-xs transition-colors', itemDiscountType === 'nominal' ? 'border-foreground bg-accent text-foreground' : 'border-input bg-transparent text-muted-foreground hover:text-foreground')}
                    >
                      {t('cashier.itemDiscountDialog.type.nominal', { symbol: currencySymbol })}
                    </button>
                    <button
                      onClick={() => setItemDiscountType('percentage')}
                      className={cn('h-9 rounded-lg border px-3 text-xsm font-medium shadow-xs transition-colors', itemDiscountType === 'percentage' ? 'border-foreground bg-accent text-foreground' : 'border-input bg-transparent text-muted-foreground hover:text-foreground')}
                    >
                      {t('cashier.itemDiscountDialog.type.percentage')}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{itemDiscountType === 'percentage' ? t('cashier.itemDiscountDialog.amountLabel.percentage') : t('cashier.itemDiscountDialog.amountLabel.nominal')}</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={itemDiscountValue}
                    onChange={e => setItemDiscountValue(e.target.value)}
                    placeholder={itemDiscountType === 'percentage' ? t('cashier.itemDiscountDialog.placeholder.percentage') : t('cashier.itemDiscountDialog.placeholder.nominal')}
                    className="h-11 text-center text-xl font-semibold tabular-nums"
                    autoFocus
                  />
                  {rawValue > 0 && (
                    <p className={cn('text-xs text-center', exceedsCap ? 'text-destructive-text' : 'text-muted-foreground')}>
                      {exceedsCap
                        ? t('cashier.itemDiscountDialog.cappedPreview.exceeds', { cap: itemDiscountType === 'percentage' ? '100%' : rp(base) })
                        : t('cashier.itemDiscountDialog.cappedPreview.normal', { amount: rp(previewAmount), subtotal: rp(Math.max(0, base - previewAmount)) })}
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  {target.discountType && (
                    <Button
                      variant="outline"
                      size="xl"
                      className="text-destructive-text border-destructive/30"
                      onClick={clearItemDiscount}
                    >
                      {t('cashier.itemDiscountDialog.delete')}
                    </Button>
                  )}
                  <Button size="xl" className="flex-1" onClick={saveItemDiscount}>
                    {t('cashier.itemDiscountDialog.save')}
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog */}
      {
        lastTransaction && (
          <Receipt
            open={receiptOpen}
            onClose={() => setReceiptOpen(false)}
            transaction={lastTransaction}
            items={lastTxItems}
            storeSettings={storeSettings}
            paymentMethodName={
              lastTransaction.debtAmount
                ? (lastTransaction.paymentAmount > 0
                  ? `${paymentMethods?.find(pm => pm.id === lastTransaction.paymentMethodId)?.name || t('cashier.paymentMethod.initialPayment')} + ${t('cashier.paymentMethod.debt')}`
                  : t('cashier.paymentMethod.debt'))
                : paymentMethods?.find(pm => pm.id === lastTransaction.paymentMethodId)?.name || t('cashier.paymentMethod.cash')
            }
            cashierName={lastTransaction.createdBy ? allUsers?.find(u => u.id === lastTransaction.createdBy)?.name : undefined}
          />
        )
      }

      {/* Save Bill Confirm Dialog */}
      <Dialog open={saveConfirmOpen} onOpenChange={setSaveConfirmOpen}>
        <DialogContent className="max-w-[95vw] md:max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle>{t('cashier.saveConfirmDialog.title')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground">
              {t('cashier.saveConfirmDialog.description')}
            </p>
            <div className="flex flex-col gap-2">
              <Button
                size="xl"
                className="w-full"
                onClick={async () => {
                  setSaveConfirmOpen(false);
                  await saveOpenBill(true);
                }}
              >
                <Printer />
                {t('cashier.buttons.saveAndPrintKitchen')}
              </Button>
              <Button
                variant="outline"
                size="xl"
                className="w-full"
                onClick={async () => {
                  setSaveConfirmOpen(false);
                  await saveOpenBill(false);
                }}
              >
                <Save />
                {t('cashier.buttons.saveOnly')}
              </Button>
              <Button
                variant="ghost"
                size="xl"
                className="w-full text-muted-foreground"
                onClick={() => setSaveConfirmOpen(false)}
              >
                {t('cashier.buttons.cancel')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Kitchen Ticket Dialog */}
      {
        kitchenTicketTx && (
          <KitchenTicket
            open={kitchenTicketOpen}
            onClose={() => setKitchenTicketOpen(false)}
            transaction={kitchenTicketTx}
            items={kitchenTicketItems}
            storeSettings={storeSettings}
            cashierName={kitchenTicketTx.createdBy ? allUsers?.find(u => u.id === kitchenTicketTx.createdBy)?.name : undefined}
          />
        )
      }

      {/* Barcode Scanner */}
      <BarcodeScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleScan}
      />

      {/* Cancel Open Bill Confirmation */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent className="max-w-[90vw] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('cashier.cancelDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('cashier.cancelDialog.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCancelTargetTx(null)}>{t('cashier.cancelDialog.no')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => cancelTargetTx && cancelOpenBill(cancelTargetTx)}
            >
              {t('cashier.cancelDialog.yes')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div >
  );
}
