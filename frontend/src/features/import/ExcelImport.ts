// src/features/import/ExcelImport.ts
// Versión sin IA: normaliza por alias de columnas y sube a la API.
// Devuelve resumen detallado (items) + cálculo local de estructura de costos.

import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as XLSX from 'xlsx';
import { Alert, Platform } from 'react-native';

// ---------------- Tipos ----------------
type ApiLike = {
  post: (url: string, body: any, opts?: any) => Promise<{ data: any }>;
  get?: (url: string, opts?: any) => Promise<{ data: any }>;
  put?: (url: string, body: any, opts?: any) => Promise<{ data: any }>;
  patch?: (url: string, body: any, opts?: any) => Promise<{ data: any }>;
};

export type AiItem = {
  sku: string;
  name: string;
  unit?: string;
  isService?: boolean;
  trackStock?: boolean;
  listPrice?: number;
  stdCost?: number | null;
  description?: string | null;
  images?: string[] | null;
  initQty?: number | null;
  initCost?: number | null;
  initWarehouseId?: number | null;
  initWarehouseName?: string | null;
};

export type ImportItemSummary = {
  sku: string;
  name: string;
  productId?: number | null;
  created: boolean;
  updated: boolean;
  skipped?: boolean;
  skippedReason?: string | null;
  isService?: boolean;
  trackStock?: boolean;
  listPrice?: number;
  stdCost?: number | null;
  initQty?: number | null;
  initCost?: number | null;
  warehouseId?: number | null;
  warehouseName?: string | null;
  costCalc?: {
    baseCost: number;        // stdCost o initCost
    overheadPct: number;     // % indirectos
    shippingPct: number;     // % flete/otros
    finalCost: number;       // costo total
    marginAbs: number;       // listPrice - finalCost
    marginPct: number;       // marginAbs / listPrice
  } | null;
};

export type ImportSummaryPayload = {
  created: number;
  updated: number;
  skipped: number;
  errors?: string[];
  items: ImportItemSummary[];
};

// ---------------- Utilidades ----------------
async function readWorkbook(uri: string) {
  console.log('[ExcelImport] readWorkbook uri=', uri, 'platform=', Platform.OS);

  if (Platform.OS === 'web') {
    const resp = await fetch(uri);
    if (!resp.ok) throw new Error(`No se pudo leer el archivo (HTTP ${resp.status})`);
    const buf = await resp.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' });
    const sheet = wb.SheetNames[0];
    const ws = wb.Sheets[sheet];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: null });
    return rows as Record<string, any>[];
  }

  // Nativo
  const b64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  const wb = XLSX.read(b64, { type: 'base64' });
  const sheet = wb.SheetNames[0];
  const ws = wb.Sheets[sheet];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: null });
  return rows as Record<string, any>[];
}

function aliasValue(o: any, keys: string[], def: any = null) {
  for (const k of keys) {
    if (o == null) continue;
    const v = o[k];
    if (v != null && String(v).trim() !== '') return v;
  }
  return def;
}

function toNumberOrNull(v: any): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function splitImages(v: any): string[] | null {
  if (v == null) return null;
  if (Array.isArray(v)) return v.filter(Boolean).map(String);
  return String(v)
    .split(/[,\n;]/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

// ---------------- Normalización sin IA (alias de columnas) ----------------
function normalizeRows(rows: any[]): AiItem[] {
  return rows.map((r) => {
    const sku = String(aliasValue(r, ['sku', 'SKU', 'codigo', 'código', 'id', 'clave'], '') || '').trim();
    const name = String(aliasValue(r, ['name', 'producto', 'nombre', 'Product', 'description', 'Description'], '') || '').trim();
    const unit = String(aliasValue(r, ['unit', 'unidad', 'uom'], 'unidad') || 'unidad').trim() || 'unidad';

    const listPriceNum = toNumberOrNull(aliasValue(r, ['listPrice', 'precio', 'price', 'pv', 'pvp'], 0)) ?? 0;
    const stdCost = toNumberOrNull(aliasValue(r, ['stdCost', 'costo', 'cost', 'costo_unit'], null));
    const initQty = toNumberOrNull(aliasValue(r, ['initQty', 'stock', 'cantidad', 'qty', 'existencia'], null));
    const initCost = toNumberOrNull(aliasValue(r, ['initCost', 'costo_inicial', 'cost_inicial'], null));
    const initWarehouseId = toNumberOrNull(aliasValue(r, ['initWarehouseId', 'warehouseId', 'almacenId', 'almacen_id'], null));
    const initWarehouseName =
      (String(aliasValue(r, ['initWarehouseName', 'warehouseName', 'almacen', 'almacén', 'nombre_almacen'], '') || '').trim() || null);

    const typeStr = String(aliasValue(r, ['tipo', 'type', 'categoria', 'category'], '') || '');
    const isService = /servicio|mano\s*de\s*obra/i.test(typeStr);

    const images = splitImages(aliasValue(r, ['imagen', 'imagenes', 'images', 'url', 'photo'], null));

    return {
      sku,
      name,
      unit,
      isService,
      trackStock: isService ? false : true,
      listPrice: listPriceNum,
      stdCost,
      description: aliasValue(r, ['description', 'descripcion', 'detalle'], null),
      images,
      initQty,
      initCost,
      initWarehouseId,
      initWarehouseName,
    } as AiItem;
  });
}

// ---------------- Almacenes ----------------
type WarehouseLite = { id: number; name?: string | null };

async function fetchWarehouses(api: ApiLike): Promise<WarehouseLite[]> {
  try {
    const { data } = await api.get?.('/warehouses')!;
    const arr = Array.isArray(data) ? data : [];
    return arr
      .map((w: any) => ({ id: Number(w?.id ?? w?.Id), name: String(w?.name ?? w?.Name ?? '').trim() || null }))
      .filter((w) => Number.isFinite(w.id));
  } catch (err) {
    console.warn('[ExcelImport] No se pudieron obtener almacenes:', err);
    return [];
  }
}

function resolveWarehouseIdFromRow(
  row: AiItem | any,
  valid: WarehouseLite[],
  fallbackId: number | null
): number | null {
  const byId = Number(row?.initWarehouseId ?? (row as any)?.warehouseId ?? (row as any)?.almacenId);
  if (Number.isFinite(byId) && valid.some((w) => w.id === byId)) return byId;

  const byNameRaw =
    row?.initWarehouseName ??
    (row as any)?.warehouseName ??
    (row as any)?.almacen ??
    (row as any)?.almacén ??
    (row as any)?.nombre_almacen ??
    null;

  const byName = String(byNameRaw ?? '').trim().toLowerCase();
  if (byName) {
    const hit = valid.find((w) => (w.name ?? '').trim().toLowerCase() === byName);
    if (hit) return hit.id;
  }

  if (fallbackId != null && valid.some((w) => w.id === fallbackId)) return fallbackId;
  return null;
}

// ---------------- Flujo principal ----------------
export async function importExcelProducts(opts: {
  api: ApiLike;
  fetchDashboard: () => Promise<void>;
  defaultWarehouseId?: number | null;
  onBusy?: (v: boolean) => void;
  onProgress?: (msg: string) => void;
}): Promise<ImportSummaryPayload> {
  const { api, fetchDashboard, defaultWarehouseId = null, onBusy, onProgress } = opts;

  try {
    onBusy?.(true);
    onProgress?.('Selecciona un archivo…');

    // 1) Seleccionar archivo
    const pick = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      type: [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv',
      ],
      multiple: false,
    });
    if (pick.canceled) {
      onProgress?.('Importación cancelada.');
      onBusy?.(false);
      return { created: 0, updated: 0, skipped: 0, errors: [], items: [] };
    }
    const file = pick.assets?.[0];
    if (!file?.uri) throw new Error('No se seleccionó archivo');

    console.log('[ExcelImport] Archivo:', { name: file.name, size: file.size, mimeType: file.mimeType, uri: file.uri });

    // 2) Leer filas
    onProgress?.('Leyendo archivo…');
    const rows = await readWorkbook(file.uri);
    console.log('[ExcelImport] Filas leídas:', rows.length);

    if (!rows.length) {
      Alert.alert('Importar', 'El archivo está vacío.');
      onBusy?.(false);
      return { created: 0, updated: 0, skipped: 0, errors: [], items: [] };
    }

    // 3) Traer almacenes válidos del tenant
    onProgress?.('Cargando almacenes…');
    const warehouses = await fetchWarehouses(api);
    const autoFallbackWarehouseId =
      defaultWarehouseId != null ? defaultWarehouseId : (warehouses.length ? warehouses[0].id : null);

    // 4) Normalizar (solo alias, sin IA)
    onProgress?.(`Normalizando ${rows.length} filas…`);
    const normalized: AiItem[] = normalizeRows(rows);
    console.log('[ExcelImport] Normalizados:', normalized.length);

    // 5) Validar y enviar a API
    let created = 0, updated = 0, skipped = 0;
    const errors: string[] = [];
    const itemsSummary: ImportItemSummary[] = [];

    // Cálculo de costos local (ajusta porcentajes a tu operación)
    function _calcCost(listPrice?: number, stdCost?: number | null, initCost?: number | null) {
      const baseCost = Number(stdCost ?? initCost ?? 0) || 0;
      const overheadPct = 0.10;  // 10% indirectos
      const shippingPct = 0.05;  // 5% flete/otros
      const finalCost = baseCost * (1 + overheadPct + shippingPct);
      const marginAbs = Math.max(0, Number(listPrice ?? 0) - finalCost);
      const marginPct = (Number(listPrice ?? 0) > 0) ? (marginAbs / Number(listPrice ?? 0)) : 0;
      return { baseCost, overheadPct, shippingPct, finalCost, marginAbs, marginPct };
    }

    onProgress?.(`Enviando ${normalized.length} productos…`);

    for (let idx = 0; idx < normalized.length; idx++) {
      const it = normalized[idx];
      const sku = String(it.sku || '').trim();
      const name = String(it.name || '').trim();

      if (!sku || !name) {
        skipped++;
        const calc = _calcCost(Number(it.listPrice ?? 0), it.stdCost, it.initCost);
        errors.push(`Fila ${idx + 1}: sin sku o name`);
        itemsSummary.push({
          sku, name,
          productId: null,
          created: false, updated: false, skipped: true,
          skippedReason: 'Faltan sku o name',
          isService: !!it.isService, trackStock: it.isService ? false : (it.trackStock ?? true),
          listPrice: Number(it.listPrice ?? 0), stdCost: it.stdCost ?? null,
          initQty: it.initQty ?? null, initCost: it.initCost ?? null,
          warehouseId: null, warehouseName: null,
          costCalc: calc,
        });
        continue;
      }

      const payload = {
        sku,
        name,
        description: (it.description ?? '') || null,
        unit: it.unit || 'unidad',
        isService: !!it.isService,
        trackStock: it.isService ? false : it.trackStock ?? true,
        listPrice: Number(it.listPrice ?? 0),
        stdCost: it.stdCost == null ? null : Number(it.stdCost),
        images: Array.isArray(it.images) ? it.images.filter(Boolean) : [],
      };

      try {
        const { data: createdProd } = await api.post('/products', payload);
        const newId: number = createdProd?.id ?? createdProd?.Id ?? createdProd?.productId ?? createdProd?.ProductId;

        let whId: number | null = null;
        if (!payload.isService && payload.trackStock) {
          const qty0 = it.initQty == null ? 0 : Number(it.initQty);
          if (Number.isFinite(newId) && qty0 > 0) {
            const unitCost0 = it.initCost == null ? null : Number(it.initCost);
            whId = resolveWarehouseIdFromRow(it, warehouses, autoFallbackWarehouseId);

            if (whId == null) {
              errors.push(`SKU ${sku}: sin almacén válido en el tenant (id/nombre). Producto creado sin stock inicial.`);
            } else {
              await api.post('/inventory/adjust', {
                productId: Number(newId),
                warehouseId: Number(whId),
                movementType: 'in',
                quantity: qty0,
                unitCost: unitCost0,
                reference: 'STOCK-INICIAL',
                reason: 'Carga inicial (importación Excel)',
              });
            }
          }
        }

        const calc = _calcCost(payload.listPrice, it.stdCost, it.initCost);
        itemsSummary.push({
          sku, name,
          productId: Number.isFinite(newId) ? Number(newId) : null,
          created: true, updated: false, skipped: false,
          isService: payload.isService, trackStock: payload.trackStock,
          listPrice: payload.listPrice, stdCost: it.stdCost ?? null,
          initQty: it.initQty ?? null, initCost: it.initCost ?? null,
          warehouseId: whId,
          warehouseName: whId != null ? (warehouses.find(w => w.id === whId)?.name ?? null) : null,
          costCalc: calc,
        });

        created += 1;
        if ((idx + 1) % 10 === 0) onProgress?.(`Procesados ${idx + 1}/${normalized.length}…`);
      } catch (e: any) {
        const msg = (e?.response?.data || e?.message || 'error') as string;
        const status = Number(e?.response?.status);
        const isConflict = status === 409 || /exist(e|e)nte|ya\s*existe|duplicate|conflict/i.test(String(msg));

        const calc = _calcCost(payload.listPrice, it.stdCost, it.initCost);

        if (isConflict) {
          updated += 1;
          itemsSummary.push({
            sku, name,
            productId: null,
            created: false, updated: true, skipped: false,
            isService: payload.isService, trackStock: payload.trackStock,
            listPrice: payload.listPrice, stdCost: it.stdCost ?? null,
            initQty: it.initQty ?? null, initCost: it.initCost ?? null,
            warehouseId: null, warehouseName: null,
            costCalc: calc,
          });
        } else {
          skipped += 1;
          errors.push(`SKU ${sku}: ${String(msg).slice(0, 200)}`);
          itemsSummary.push({
            sku, name,
            productId: null,
            created: false, updated: false, skipped: true,
            skippedReason: String(msg).slice(0, 200),
            isService: payload.isService, trackStock: payload.trackStock,
            listPrice: payload.listPrice, stdCost: it.stdCost ?? null,
            initQty: it.initQty ?? null, initCost: it.initCost ?? null,
            warehouseId: null, warehouseName: null,
            costCalc: calc,
          });
        }
      }
    }

    onProgress?.('Finalizando…');
    await Promise.resolve(fetchDashboard());
    onBusy?.(false);

    return { created, updated, skipped, errors, items: itemsSummary };
  } catch (e: any) {
    onBusy?.(false);
    const msg = String(e?.message || e);
    console.error('[ExcelImport] Error fatal:', msg);
    Alert.alert('Importar Excel', msg);
    return { created: 0, updated: 0, skipped: 0, errors: [msg], items: [] };
  }
}
