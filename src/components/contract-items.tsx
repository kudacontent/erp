"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Save, Trash2, X } from "lucide-react";
import { formatWon } from "@/lib/money";

type TaxType = "TAXABLE" | "ZERO_RATED" | "EXEMPT";

const TAX_LABEL: Record<TaxType, string> = {
  TAXABLE: "과세",
  ZERO_RATED: "영세율",
  EXEMPT: "면세"
};

type Row = {
  /** 화면 안에서만 쓰는 행 식별자. 저장하면 서버가 새 id 를 준다 */
  key: string;
  name: string;
  spec: string;
  unit: string;
  quantity: string;
  unitPrice: string;
  taxType: TaxType;
};

type ApiItem = {
  id: string;
  name: string;
  spec: string | null;
  unit: string | null;
  quantity: number;
  unitPrice: string;
  taxType: string;
};

function newKey() {
  return Math.random().toString(36).slice(2, 10);
}

function emptyRow(): Row {
  return { key: newKey(), name: "", spec: "", unit: "식", quantity: "1", unitPrice: "", taxType: "TAXABLE" };
}

function toRow(item: ApiItem): Row {
  return {
    key: item.id,
    name: item.name,
    spec: item.spec ?? "",
    unit: item.unit ?? "",
    quantity: String(item.quantity),
    unitPrice: item.unitPrice,
    taxType: (item.taxType as TaxType) ?? "TAXABLE"
  };
}

/** 입력값에서 숫자만. "1,000" 도 "1000" 으로 읽는다 */
function num(value: string) {
  const parsed = Number(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function rowAmounts(row: Row) {
  const supply = Math.round(num(row.quantity) * num(row.unitPrice));
  const vat = row.taxType === "TAXABLE" ? Math.round(supply / 10) : 0;
  return { supply, vat };
}

/**
 * 계약 품목 표.
 *
 * 계약마다 품목 구성이 달라서 (한 줄짜리 용역부터 여러 줄 납품까지)
 * 행을 자유롭게 넣고 빼도록 만들었다. 저장은 표 전체를 한 번에 보낸다.
 *
 * 합계는 화면에서 미리 보여 주지만, 실제 계약 금액은 서버가 다시 계산한다.
 * (브라우저에서 계산한 값을 그대로 믿으면 조작할 수 있다)
 */
export function ContractItems({ slug, canEdit }: { slug: string; canEdit: boolean }) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    fetch(`/api/contracts/${slug}/items`)
      .then((response) => response.json())
      .then((data: { ok: boolean; items?: ApiItem[]; message?: string }) => {
        if (!alive) return;
        if (data.ok && data.items) {
          setRows(data.items.map(toRow));
        } else if (data.message) {
          setError(data.message);
        }
      })
      .catch(() => {
        if (alive) setError("품목을 불러오지 못했습니다.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [slug]);

  const totals = useMemo(() => {
    return rows.reduce(
      (sum, row) => {
        const { supply, vat } = rowAmounts(row);
        return { supply: sum.supply + supply, vat: sum.vat + vat };
      },
      { supply: 0, vat: 0 }
    );
  }, [rows]);

  function update(key: string, patch: Partial<Row>) {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  function remove(key: string) {
    setRows((current) => current.filter((row) => row.key !== key));
  }

  async function save() {
    const filled = rows.filter((row) => row.name.trim().length > 0);

    if (filled.length !== rows.length) {
      setError("품목명이 비어 있는 줄이 있습니다. 이름을 넣거나 그 줄을 지우세요.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/contracts/${slug}/items`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: filled.map((row) => ({
            name: row.name.trim(),
            spec: row.spec.trim() || null,
            unit: row.unit.trim() || null,
            quantity: num(row.quantity),
            unitPrice: num(row.unitPrice),
            taxType: row.taxType
          }))
        })
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        setError(data.message ?? "저장하지 못했습니다.");
        return;
      }

      setRows((data.items as ApiItem[]).map(toRow));
      setEditing(false);
      // 계약 금액 카드가 서버에서 다시 그려지도록
      router.refresh();
    } catch {
      setError("저장 중 문제가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-line bg-white p-5 text-sm text-steel">
        <Loader2 className="h-4 w-4 animate-spin" />
        품목을 불러오는 중입니다.
      </div>
    );
  }

  return (
    <section className="rounded-md border border-line bg-white p-5">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-bold text-ink">계약 품목</h3>
          <p className="mt-1 text-sm text-steel">
            품목을 넣으면 공급가액·부가세·합계가 자동으로 계산되어 계약 금액에 반영됩니다.
          </p>
        </div>

        {canEdit ? (
          editing ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-md bg-marine px-3 py-2 text-sm font-bold text-white disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                저장
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setError(null);
                  router.refresh();
                }}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm font-medium text-steel"
              >
                <X className="h-4 w-4" />
                취소
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm font-medium text-marine"
            >
              <Plus className="h-4 w-4" />
              품목 편집
            </button>
          )
        ) : null}
      </div>

      {error ? (
        <p className="mb-4 rounded-md border border-danger-border bg-danger-bg px-3 py-2 text-sm font-medium text-danger-fg">
          {error}
        </p>
      ) : null}

      {rows.length === 0 && !editing ? (
        <div className="rounded-md bg-paper px-4 py-8 text-center">
          <p className="text-sm font-medium text-ink">등록된 품목이 없습니다.</p>
          <p className="mt-1 text-sm text-steel">
            {canEdit
              ? "품목을 넣지 않고 계약 총액만 관리해도 됩니다. 세부 내역이 필요하면 '품목 편집'을 누르세요."
              : "품목을 등록하려면 담당자에게 요청하세요."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-steel">
                <th className="w-8 py-2 pr-2 font-medium">#</th>
                <th className="py-2 pr-2 font-medium">품목명</th>
                <th className="py-2 pr-2 font-medium">규격</th>
                <th className="w-16 py-2 pr-2 font-medium">단위</th>
                <th className="w-20 py-2 pr-2 text-right font-medium">수량</th>
                <th className="w-32 py-2 pr-2 text-right font-medium">단가</th>
                <th className="w-24 py-2 pr-2 font-medium">세금</th>
                <th className="w-32 py-2 pr-2 text-right font-medium">공급가액</th>
                <th className="w-28 py-2 pr-2 text-right font-medium">부가세</th>
                {editing ? <th className="w-10 py-2" /> : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const { supply, vat } = rowAmounts(row);

                return (
                  <tr key={row.key} className="border-b border-line align-middle">
                    <td className="py-2 pr-2 text-steel">{index + 1}</td>
                    <td className="py-2 pr-2">
                      {editing ? (
                        <input
                          value={row.name}
                          onChange={(event) => update(row.key, { name: event.target.value })}
                          aria-label={`${index + 1}번 품목명`}
                          className="w-full rounded-md border border-line bg-paper px-2 py-1.5 text-sm text-ink outline-none focus:border-marine"
                        />
                      ) : (
                        <span className="font-medium text-ink">{row.name}</span>
                      )}
                    </td>
                    <td className="py-2 pr-2">
                      {editing ? (
                        <input
                          value={row.spec}
                          onChange={(event) => update(row.key, { spec: event.target.value })}
                          aria-label={`${index + 1}번 규격`}
                          className="w-full rounded-md border border-line bg-paper px-2 py-1.5 text-sm text-ink outline-none focus:border-marine"
                        />
                      ) : (
                        <span className="text-steel">{row.spec || "-"}</span>
                      )}
                    </td>
                    <td className="py-2 pr-2">
                      {editing ? (
                        <input
                          value={row.unit}
                          onChange={(event) => update(row.key, { unit: event.target.value })}
                          aria-label={`${index + 1}번 단위`}
                          className="w-full rounded-md border border-line bg-paper px-2 py-1.5 text-sm text-ink outline-none focus:border-marine"
                        />
                      ) : (
                        <span className="text-steel">{row.unit || "-"}</span>
                      )}
                    </td>
                    <td className="py-2 pr-2 text-right">
                      {editing ? (
                        <input
                          value={row.quantity}
                          onChange={(event) => update(row.key, { quantity: event.target.value })}
                          inputMode="decimal"
                          aria-label={`${index + 1}번 수량`}
                          className="w-full rounded-md border border-line bg-paper px-2 py-1.5 text-right text-sm text-ink outline-none focus:border-marine"
                        />
                      ) : (
                        <span className="text-ink">{num(row.quantity).toLocaleString("ko-KR")}</span>
                      )}
                    </td>
                    <td className="py-2 pr-2 text-right">
                      {editing ? (
                        <input
                          value={row.unitPrice}
                          onChange={(event) => update(row.key, { unitPrice: event.target.value })}
                          inputMode="numeric"
                          aria-label={`${index + 1}번 단가`}
                          className="w-full rounded-md border border-line bg-paper px-2 py-1.5 text-right text-sm text-ink outline-none focus:border-marine"
                        />
                      ) : (
                        <span className="text-ink">{formatWon(num(row.unitPrice))}</span>
                      )}
                    </td>
                    <td className="py-2 pr-2">
                      {editing ? (
                        <select
                          value={row.taxType}
                          onChange={(event) => update(row.key, { taxType: event.target.value as TaxType })}
                          aria-label={`${index + 1}번 세금 구분`}
                          className="w-full rounded-md border border-line bg-paper px-2 py-1.5 text-sm text-ink outline-none focus:border-marine"
                        >
                          <option value="TAXABLE">과세</option>
                          <option value="ZERO_RATED">영세율</option>
                          <option value="EXEMPT">면세</option>
                        </select>
                      ) : (
                        <span className="text-steel">{TAX_LABEL[row.taxType]}</span>
                      )}
                    </td>
                    <td className="py-2 pr-2 text-right font-medium text-ink">{formatWon(supply)}</td>
                    <td className="py-2 pr-2 text-right text-steel">{formatWon(vat)}</td>
                    {editing ? (
                      <td className="py-2 text-right">
                        <button
                          type="button"
                          onClick={() => remove(row.key)}
                          aria-label={`${index + 1}번 품목 삭제`}
                          className="rounded-md p-1.5 text-steel hover:bg-danger-bg hover:text-danger-fg"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="text-sm">
                <td colSpan={7} className="py-3 pr-2 text-right font-medium text-steel">
                  합계
                </td>
                <td className="py-3 pr-2 text-right font-bold text-ink">{formatWon(totals.supply)}</td>
                <td className="py-3 pr-2 text-right font-bold text-ink">{formatWon(totals.vat)}</td>
                {editing ? <td /> : null}
              </tr>
              <tr className="text-sm">
                <td colSpan={7} className="pr-2 text-right font-medium text-steel">
                  합계 금액 (공급가액 + 부가세)
                </td>
                <td colSpan={editing ? 3 : 2} className="pr-2 text-right text-lg font-bold text-marine">
                  {formatWon(totals.supply + totals.vat)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {editing ? (
        <button
          type="button"
          onClick={() => setRows((current) => [...current, emptyRow()])}
          className="mt-4 inline-flex items-center gap-2 rounded-md border border-dashed border-line px-3 py-2 text-sm font-medium text-marine"
        >
          <Plus className="h-4 w-4" />
          품목 줄 추가
        </button>
      ) : null}
    </section>
  );
}
