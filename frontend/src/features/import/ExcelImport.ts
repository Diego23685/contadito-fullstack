// src/features/import/ExcelImport.ts
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

// ---------------- Utilidades ----------------
async function readWorkbook(uri: string) {
  console.log('[ExcelImport] readWorkbook uri=', uri, 'platform=', Platform.OS);

  // En Web la uri es "blob:" y FileSystem NO puede leerla.
  if (Platform.OS === 'web') {
    // Descargar el blob y pasarlo a ArrayBuffer para XLSX
    const resp = await fetch(uri);
    if (!resp.ok) {
      throw new Error(`No se pudo leer el archivo (HTTP ${resp.status})`);
    }
    const buf = await resp.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' }); // <-- clave en Web
    const sheet = wb.SheetNames[0];
    const ws = wb.Sheets[sheet];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: null });
    return rows as Record<string, any>[];
  }

  // En nativo sí podemos leer como base64 y parsear
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

// ---------------- Fallback sin IA ----------------
function fallbackNormalize(rows: any[]): AiItem[] {
  return rows.map((r) => {
    const sku = String(aliasValue(r, ['sku', 'SKU', 'codigo', 'código', 'id', 'clave'], '') || '').trim();
    const name = String(aliasValue(r, ['name', 'producto', 'nombre', 'Product', 'description', 'Description'], '') || '').trim();
    const unit = String(aliasValue(r, ['unit', 'unidad', 'uom'], 'unidad') || 'unidad').trim() || 'unidad';

    const listPriceNum = toNumberOrNull(aliasValue(r, ['listPrice', 'precio', 'price', 'pv', 'pvp'], 0)) ?? 0;
    const stdCost = toNumberOrNull(aliasValue(r, ['stdCost', 'costo', 'cost', 'costo_unit'], null));
    const initQty = toNumberOrNull(aliasValue(r, ['initQty', 'stock', 'cantidad', 'qty', 'existencia'], null));
    const initCost = toNumberOrNull(aliasValue(r, ['initCost', 'costo_inicial', 'cost_inicial'], null));
    const initWarehouseId = toNumberOrNull(aliasValue(r, ['initWarehouseId', 'warehouseId', 'almacenId', 'almacen_id'], null));
    const initWarehouseName = String(
      aliasValue(r, ['initWarehouseName', 'warehouseName', 'almacen', 'almacén', 'nombre_almacen'], '') || ''
    ).trim() || null;

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
      stdCost: stdCost,
      description: aliasValue(r, ['description', 'descripcion', 'detalle'], null),
      images,
      initQty,
      initCost,
      initWarehouseId,
      initWarehouseName,
    };
  });
}

// ---------------- Normalización con IA (Ollama) ----------------
async function aiNormalizeProducts(
  rows: any[],
  modelBase: string,
  model: string,
  signal?: AbortSignal
): Promise<AiItem[]> {
  const system = `Eres un asistente de datos para importar catálogo de productos/servicios a un ERP.
Devuelve SOLO JSON válido con EXACTAMENTE este shape:
{
  "items": [{
    "sku": "string",
    "name": "string",
    "unit": "string",
    "isService": boolean,
    "trackStock": boolean,
    "listPrice": number,
    "stdCost": number|null,
    "description": "string|null",
    "images": ["url", ...] | null,
    "initQty": number|null,
    "initCost": number|null,
    "initWarehouseId": number|null,
    "initWarehouseName": "string|null"
  }]
}
Reglas:
- Detecta alias de columnas (codigo/SKU/id/clave -> sku; producto/nombre -> name; unidad/uom -> unit; precio/listPrice; costo/stdCost; stock/initQty; costo_inicial/initCost; almacen/warehouse/initWarehouseId; nombre de almacén -> initWarehouseName; imagen/imagenes/url -> images).
- Convierte numéricos. Si vacío o inválido -> null (salvo listPrice, usa 0).
- unit por defecto "unidad" si falta.
- isService true si la fila indica servicio/mano de obra o similar. Si no hay señal, false.
- trackStock false si es servicio, si no true salvo que haya "trackStock=0".
- images: partir por coma si vienen múltiples.
- NUNCA inventes valores. Mantén null cuando no haya datos.`;

  // Recortar payload para evitar OOM en Ollama
  const payloadStr = JSON.stringify(rows).slice(0, 25000);
  const user = `Normaliza estas filas a ese shape. Responde SOLO el JSON:\n${payloadStr}`;

  const res = await fetch(`${modelBase}/api/chat`, {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      stream: false,
      options: {
        temperature: 0.1,
        num_ctx: 1024,
        num_predict: 256,
        num_gpu: 0,
      },
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
    }),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => `HTTP ${res.status}`);
    throw new Error(`IA: ${txt}`);
  }

  const body = await res.json();
  const text: string = body?.message?.content ?? body?.response ?? '';
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('IA no devolvió JSON');

  const parsed = JSON.parse(text.slice(start, end + 1));
  if (!parsed?.items || !Array.isArray(parsed.items)) throw new Error('JSON inválido de IA');

  const items = (parsed.items as AiItem[]).map((it) => ({
    sku: String(it?.sku ?? '').trim(),
    name: String(it?.name ?? '').trim(),
    unit: (it?.unit && String(it.unit).trim()) || 'unidad',
    isService: !!it?.isService,
    trackStock: it?.isService ? false : it?.trackStock ?? true,
    listPrice: Number.isFinite(Number(it?.listPrice)) ? Number(it?.listPrice) : 0,
    stdCost: it?.stdCost == null || isNaN(Number(it.stdCost)) ? null : Number(it.stdCost),
    description: (it?.description ?? null) as any,
    images: Array.isArray(it?.images) ? it.images.filter(Boolean) : null,
    initQty: it?.initQty == null || isNaN(Number(it.initQty)) ? null : Number(it.initQty),
    initCost: it?.initCost == null || isNaN(Number(it.initCost)) ? null : Number(it.initCost),
    initWarehouseId:
      it?.initWarehouseId == null || isNaN(Number(it.initWarehouseId)) ? null : Number(it.initWarehouseId),
    initWarehouseName:
      (it?.initWarehouseName == null || String(it.initWarehouseName).trim() === '')
        ? null
        : String(it.initWarehouseName).trim(),
  }));

  return items;
}

// ---------------- Almacenes ----------------
type WarehouseLite = { id: number; name?: string | null };

async function fetchWarehouses(api: ApiLike): Promise<WarehouseLite[]> {
  try {
    const { data } = await api.get?.('/warehouses')!;
    const arr = Array.isArray(data) ? data : [];
    return arr
      .map((w: any) => ({
        id: Number(w?.id ?? w?.Id),
        name: String(w?.name ?? w?.Name ?? '').trim() || null,
      }))
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
  OLLAMA_BASE: string;
  OLLAMA_MODEL: string;
  defaultWarehouseId?: number | null;
  onBusy?: (v: boolean) => void;
  onProgress?: (msg: string) => void;
}): Promise<{ created: number; updated: number; skipped: number; errors?: string[] }> {
  const { api, fetchDashboard, OLLAMA_BASE, OLLAMA_MODEL, defaultWarehouseId = null, onBusy, onProgress } = opts;

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
      return { created: 0, updated: 0, skipped: 0 };
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
      return { created: 0, updated: 0, skipped: 0 };
    }

    // 3) Traer almacenes válidos del tenant
    onProgress?.('Cargando almacenes…');
    const warehouses = await fetchWarehouses(api);
    const autoFallbackWarehouseId =
      defaultWarehouseId != null ? defaultWarehouseId : (warehouses.length ? warehouses[0].id : null);

    // 4) Normalizar (IA con fallback por chunks)
    const chunkSize = 60;
    const normalized: AiItem[] = [];

    onProgress?.(`Normalizando ${rows.length} filas…`);
    for (let i = 0; i < rows.length; i += chunkSize) {
      const part = rows.slice(i, i + chunkSize);
      onProgress?.(`Filas ${i + 1}–${Math.min(i + chunkSize, rows.length)}…`);

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 30_000);

      try {
        const norm = await aiNormalizeProducts(part, OLLAMA_BASE, OLLAMA_MODEL, controller.signal);
        normalized.push(...norm);
      } catch (err: any) {
        console.warn('IA falló en el chunk', i, err?.message || err);
        onProgress?.('IA no disponible. Usando mapeo directo…');
        normalized.push(...fallbackNormalize(part));
      } finally {
        clearTimeout(timer);
      }
    }
    console.log('[ExcelImport] Normalizados:', normalized.length);

    // 5) Validar y enviar a API
    let created = 0, updated = 0, skipped = 0;
    const errors: string[] = [];

    onProgress?.(`Enviando ${normalized.length} productos…`);

    for (let idx = 0; idx < normalized.length; idx++) {
      const it = normalized[idx];
      const sku = String(it.sku || '').trim();
      const name = String(it.name || '').trim();

      if (!sku || !name) {
        skipped++;
        errors.push(`Fila ${idx + 1}: sin sku o name`);
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
        const newId: number =
          createdProd?.id ?? createdProd?.Id ?? createdProd?.productId ?? createdProd?.ProductId;

        if (!payload.isService && payload.trackStock) {
          const qty0 = it.initQty == null ? 0 : Number(it.initQty);
          if (Number.isFinite(newId) && qty0 > 0) {
            const unitCost0 = it.initCost == null ? null : Number(it.initCost);
            const whId = resolveWarehouseIdFromRow(it, warehouses, autoFallbackWarehouseId);

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

        created += 1;
        if ((idx + 1) % 10 === 0) onProgress?.(`Procesados ${idx + 1}/${normalized.length}…`);
      } catch (e: any) {
        const msg = (e?.response?.data || e?.message || 'error') as string;
        const status = Number(e?.response?.status);
        const isConflict = status === 409 || /exist(e|e)nte|ya\s*existe|duplicate|conflict/i.test(String(msg));

        if (isConflict) {
          updated += 1;
        } else {
          skipped += 1;
          errors.push(`SKU ${sku}: ${String(msg).slice(0, 200)}`);
        }
      }
    }

    onProgress?.('Finalizando…');
    await Promise.resolve(fetchDashboard());
    onBusy?.(false);

    return { created, updated, skipped, errors };
  } catch (e: any) {
    onBusy?.(false);
    const msg = String(e?.message || e);
    console.error('[ExcelImport] Error fatal:', msg);
    Alert.alert('Importar Excel', msg);
    return { created: 0, updated: 0, skipped: 0, errors: [msg] };
  }
}
