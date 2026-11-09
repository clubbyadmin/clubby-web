"use client";

import { api, getErrorMessage } from "@/services/api";
import { Download, Upload } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Section } from "./partner-shared";

type ImportRow = {
  name?: string;
  phone?: string;
  email?: string | null;
  birthDate?: string | null;
  notes?: string | null;
  lastService?: string | null;
  lastVisitAt?: string | null;
};

type ClientItem = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  birthDate: string | null;
  notes: string | null;
  historyCount: number;
  createdAt: string;
  updatedAt: string;
};

const TEMPLATE_CSV = `nome,telefone,email,nascimento,observacoes,ultimo_servico,ultima_visita
Maria Silva,11999990001,maria@email.com,1990-05-12,Cliente VIP,Corte masculino,2026-10-01
João Santos,11999990002,,1988-01-20,,Barba,2026-09-15
`;

function parseCsv(text: string): ImportRow[] {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return [];
  }

  const headers = splitCsvLine(lines[0]).map((header) =>
    header.trim().toLowerCase(),
  );

  const indexOf = (...aliases: string[]) =>
    headers.findIndex((header) => aliases.includes(header));

  const nameIdx = indexOf("nome", "name", "cliente");
  const phoneIdx = indexOf("telefone", "phone", "whatsapp", "celular");
  const emailIdx = indexOf("email", "e-mail");
  const birthIdx = indexOf("nascimento", "birthdate", "data_nascimento");
  const notesIdx = indexOf("observacoes", "observações", "notes", "obs");
  const serviceIdx = indexOf(
    "ultimo_servico",
    "último_servico",
    "last_service",
    "servico",
  );
  const visitIdx = indexOf(
    "ultima_visita",
    "última_visita",
    "last_visit",
    "data_visita",
  );

  return lines.slice(1).map((line) => {
    const cols = splitCsvLine(line);
    return {
      name: nameIdx >= 0 ? cols[nameIdx] : cols[0],
      phone: phoneIdx >= 0 ? cols[phoneIdx] : cols[1],
      email: emailIdx >= 0 ? cols[emailIdx] || null : null,
      birthDate: birthIdx >= 0 ? cols[birthIdx] || null : null,
      notes: notesIdx >= 0 ? cols[notesIdx] || null : null,
      lastService: serviceIdx >= 0 ? cols[serviceIdx] || null : null,
      lastVisitAt: visitIdx >= 0 ? cols[visitIdx] || null : null,
    };
  });
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  result.push(current.trim());
  return result;
}

export function PartnerMigrationPanel({
  partnerId,
  onChanged,
}: {
  partnerId: string;
  onChanged?: () => void;
}) {
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [previewCount, setPreviewCount] = useState(0);
  const [pendingRows, setPendingRows] = useState<ImportRow[]>([]);
  const [importErrors, setImportErrors] = useState<
    Array<{ row: number; phone?: string; message: string }>
  >([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.getSuperAdminTenantClients(partnerId);
      setClients(response.items);
      setTotal(response.total);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [partnerId]);

  useEffect(() => {
    void load();
  }, [load]);

  function downloadTemplate() {
    const blob = new Blob([TEMPLATE_CSV], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "modelo-migracao-clientes-clubby.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function onFileSelected(file: File | null) {
    if (!file) {
      return;
    }
    setError(null);
    setNotice(null);
    setImportErrors([]);
    try {
      const text = await file.text();
      const rows = parseCsv(text);
      if (rows.length === 0) {
        setError("CSV sem linhas válidas. Use o modelo baixado.");
        setPendingRows([]);
        setPreviewCount(0);
        return;
      }
      setPendingRows(rows);
      setPreviewCount(rows.length);
      setNotice(`${rows.length} linhas prontas para importar.`);
    } catch {
      setError("Não foi possível ler o arquivo CSV.");
    }
  }

  async function runImport() {
    if (pendingRows.length === 0) {
      return;
    }
    setImporting(true);
    setError(null);
    setNotice(null);
    try {
      const result = await api.importSuperAdminTenantClients(
        partnerId,
        pendingRows,
      );
      setNotice(result.message);
      setImportErrors(result.errors);
      setPendingRows([]);
      setPreviewCount(0);
      onChanged?.();
      await load();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-5">
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      {notice ? <p className="text-sm text-emerald-300">{notice}</p> : null}

      <Section
        title="Migração de clientes (CSV)"
        description="Importe a base vinda de concorrentes (Trinks, Booksy, Beauty Date, planilha própria). Telefone é a chave: se já existir, atualiza; se não, cria. Colunas opcionais de último serviço/visita geram histórico."
      >
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={downloadTemplate}
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-zinc-700 px-4 text-sm font-semibold text-zinc-100"
          >
            <Download className="size-4" />
            Baixar modelo CSV
          </button>
          <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full bg-amber-300 px-4 text-sm font-semibold text-zinc-950">
            <Upload className="size-4" />
            Selecionar CSV
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(event) =>
                void onFileSelected(event.target.files?.[0] ?? null)
              }
            />
          </label>
          <button
            type="button"
            disabled={importing || pendingRows.length === 0}
            onClick={() => void runImport()}
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-4 text-sm font-semibold text-emerald-200 disabled:opacity-60"
          >
            {importing
              ? "Importando..."
              : previewCount > 0
                ? `Importar ${previewCount} linhas`
                : "Importar"}
          </button>
        </div>
        <ul className="mt-4 space-y-1 text-xs text-zinc-500">
          <li>• Colunas mínimas: nome, telefone</li>
          <li>
            • Opcionais: email, nascimento (AAAA-MM-DD), observacoes,
            ultimo_servico, ultima_visita
          </li>
          <li>• Até 2000 linhas por lote</li>
        </ul>
        {importErrors.length > 0 ? (
          <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3">
            <p className="text-sm font-medium text-red-200">
              {importErrors.length} linha(s) com erro
            </p>
            <ul className="mt-2 space-y-1 text-xs text-red-200/80">
              {importErrors.slice(0, 10).map((item) => (
                <li key={`${item.row}-${item.message}`}>
                  Linha {item.row}
                  {item.phone ? ` (${item.phone})` : ""}: {item.message}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Section>

      <Section title={`Base atual (${total})`}>
        {loading ? (
          <p className="text-sm text-zinc-500">Carregando clientes...</p>
        ) : clients.length === 0 ? (
          <p className="text-sm text-zinc-500">
            Nenhum cliente cadastrado neste estabelecimento.
          </p>
        ) : (
          <div className="space-y-2">
            {clients.map((client) => (
              <div
                key={client.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-zinc-800 bg-zinc-950/60 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-zinc-100">
                    {client.name}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {client.phone}
                    {client.email ? ` · ${client.email}` : ""}
                  </p>
                </div>
                <p className="text-xs text-zinc-500">
                  {client.historyCount} histórico(s)
                </p>
              </div>
            ))}
            {total > clients.length ? (
              <p className="text-xs text-zinc-500">
                Mostrando {clients.length} de {total}.
              </p>
            ) : null}
          </div>
        )}
      </Section>
    </div>
  );
}
