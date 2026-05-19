import { useEffect, useMemo, useState, useCallback } from "react";
import "../styles/TabelaPreco.css";
import { isUsuarioComum } from "../services/usuarioService";
import {
  fetchPrecosPorTabela,
  fetchNomesTabelasVenda,
  cadastrarTabelaVenda,
  fetchTodosProdutos,
  salvarPrecosEmLote,
} from "../services/tabelaPrecoService";
import TabelasPrecoCompra from "./TabelasPrecoCompra";

// ─── Helpers ────────────────────────────────────────────────────────────────

function isoParaDDMM(iso) {
  if (!iso) return "—";
  const [, m, d] = String(iso).split("-");
  return `${d}/${m}`;
}

function parseBRL(valor) {
  if (valor === null || valor === undefined || valor === "—" || valor === "") return null;
  if (typeof valor === "number") return valor;
  const cleaned = String(valor)
    .replace("R$", "").replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function formatBRL(valor) {
  if (valor === null || valor === undefined) return "—";
  return `R$ ${Number(valor).toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}

function getTrendClass(current, prev) {
  const c = parseBRL(current);
  const p = parseBRL(prev);
  if (c === null || p === null) return "";
  if (c > p) return "cellUp";
  if (c < p) return "cellDown";
  return "";
}

function hojeISO() { return new Date().toISOString().slice(0, 10); }
function hojeDDMM() { return isoParaDDMM(hojeISO()); }

function buildTableModel(rows, todosProdutos = [], tabelaNova = false) {
  const dateSet = new Set();
  const productSet = new Set();
  const valueMap = new Map();
  const versaoMap = new Map();
  const isoMap = new Map();

  for (const r of rows) {
    const nome = String(r.nomeTabela ?? "").trim();
    const iso = String(r.dataInicioValidade ?? "").trim();
    const ddmm = isoParaDDMM(iso);
    const preco = r.precoProduto ?? null;
    const versao = r.versao ?? null;
    if (!nome || !ddmm) continue;
    dateSet.add(ddmm);
    productSet.add(nome);
    valueMap.set(`${nome}__${ddmm}`, preco);
    versaoMap.set(ddmm, versao);
    isoMap.set(ddmm, iso);
  }

  if (tabelaNova) {
    const hoje = hojeDDMM();
    dateSet.add(hoje);
    isoMap.set(hoje, hojeISO());
    versaoMap.set(hoje, 1.0);
    for (const p of todosProdutos) productSet.add(p.nome);
  }

  const datas = Array.from(dateSet).sort((a, b) =>
    (isoMap.get(b) ?? b).localeCompare(isoMap.get(a) ?? a)
  );
  const produtos = Array.from(productSet).sort((a, b) => a.localeCompare(b, "pt-BR"));
  return { datas, produtos, valueMap, versaoMap };
}

// ─── Modal nova tabela ───────────────────────────────────────────────────────

function ModalNovaTabela({ onConfirmar, onCancelar, salvando }) {
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState("");

  function handleConfirmar() {
    const nomeTrimmed = nome.trim().toUpperCase();
    if (!nomeTrimmed) { setErro("O nome e obrigatorio."); return; }
    setErro("");
    onConfirmar(nomeTrimmed);
  }

  return (
    <div className="modalOverlay">
      <div className="modal-container-cliente">
        <div className="modal-header-cliente">
          <h2 style={{ margin: 0, color: "#020618", fontSize: "1.3rem", fontWeight: 700 }}>
            Nova tabela de venda
          </h2>
        </div>
        <div style={{ padding: "20px 0" }}>
          <label style={{ fontSize: "0.85rem", color: "#314158", fontWeight: 500 }}>
            Nome da tabela
          </label>
          <input
            style={{
              width: "100%", padding: "10px 12px", border: "1px solid #ccc",
              borderRadius: "6px", fontSize: "0.95rem", fontFamily: "inherit",
              color: "#020618", outline: "none", boxSizing: "border-box",
              textTransform: "uppercase", marginTop: "6px",
            }}
            placeholder="Ex: TOCANTINS"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleConfirmar()}
            autoFocus
          />
          {erro && <span style={{ color: "#dc2626", fontSize: "0.85rem" }}>{erro}</span>}
          <span style={{ color: "#6b7280", fontSize: "0.8rem", lineHeight: 1.5, display: "block", marginTop: "6px" }}>
            Sera criada com tipo Venda, versao 1.0 e data de inicio hoje.
          </span>
        </div>
        <div className="modal-footer">
          <button
            style={{ padding: "10px 20px", background: "#dc2626", color: "white", border: "none", borderRadius: "6px", fontSize: "0.9rem", fontWeight: 500, cursor: "pointer", marginRight: "8px" }}
            onClick={onCancelar} disabled={salvando}
          >
            Fechar
          </button>
          <button className="modal-save" onClick={handleConfirmar} disabled={salvando}>
            {salvando ? "Criando..." : "Criar tabela"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────

export default function PrecosVenda() {
  const usuarioComum = isUsuarioComum();
  const [view, setView] = useState("venda"); // "venda" | "compra"

  // Se trocou para compra, renderiza o outro componente
  if (view === "compra") {
    return <TabelasPrecoCompra onVoltar={() => setView("venda")} />;
  }

  return <TabelaVendaView usuarioComum={usuarioComum} onIrParaCompra={() => setView("compra")} />;
}

function TabelaVendaView({ usuarioComum, onIrParaCompra }) {
  const [tabelas, setTabelas] = useState([]);
  const [tabela, setTabela] = useState("");
  const [rows, setRows] = useState([]);
  const [todosProdutos, setTodosProdutos] = useState([]);
  const [tabelaNova, setTabelaNova] = useState(false);
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [criandoTabela, setCriandoTabela] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [edits, setEdits] = useState({});

  const carregarTabelas = useCallback(async () => {
    try {
      const nomes = await fetchNomesTabelasVenda();
      setTabelas(nomes);
      if (nomes.length > 0 && !tabela) setTabela(nomes[0]);
    } catch { setTabelas([]); }
  }, [tabela]);

  useEffect(() => { carregarTabelas(); }, []);
  useEffect(() => {
    fetchTodosProdutos().then((d) => setTodosProdutos(Array.isArray(d) ? d : [])).catch(() => setTodosProdutos([]));
  }, []);

  const carregarDados = useCallback(async (t) => {
    if (!t) return;
    setLoading(true); setErro(""); setSucesso(""); setEdits({}); setTabelaNova(false);
    try {
      const data = await fetchPrecosPorTabela(t);
      setRows(Array.isArray(data) ? data : []);
      if (!data || data.length === 0) setTabelaNova(true);
    } catch (e) {
      setRows([]);
      setErro(e?.response?.data?.message || e?.message || "Erro ao carregar dados");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (tabela) carregarDados(tabela); }, [tabela, carregarDados]);
  useEffect(() => { document.title = "CR Metais | Tabela de precos"; }, []);

  const { datas, produtos, valueMap, versaoMap } = useMemo(
    () => buildTableModel(rows, todosProdutos, tabelaNova),
    [rows, todosProdutos, tabelaNova]
  );

  const dataMaisRecente = datas[0];

  function handleCellChange(nome, valor) {
    setEdits((prev) => ({ ...prev, [nome]: valor }));
  }

  function handleCellBlur(nome, valorDigitado) {
    const nDigitado = parseBRL(valorDigitado);
    const nOriginal = parseBRL(valueMap.get(`${nome}__${dataMaisRecente}`));
    if (nDigitado === null || nDigitado === nOriginal) {
      setEdits((prev) => { const next = { ...prev }; delete next[nome]; return next; });
      return;
    }
    handleCellChange(nome, formatBRL(nDigitado));
  }

  async function handleSalvar() {
    setSalvando(true); setErro(""); setSucesso("");
    try {
      const itens = produtos
        .map((nome) => {
          const valorFinal = edits[nome] !== undefined ? edits[nome] : valueMap.get(`${nome}__${dataMaisRecente}`);
          return { nomeProduto: nome, preco: parseBRL(valorFinal) };
        })
        .filter((i) => i.preco !== null && i.preco > 0);
      await salvarPrecosEmLote(tabela, itens);
      setSucesso("Precos salvos. Nova versao criada.");
      setTabelaNova(false);
      await carregarDados(tabela);
    } catch (e) {
      setErro(e?.response?.data?.message || e?.message || "Erro ao salvar");
    } finally { setSalvando(false); }
  }

  async function handleCriarTabela(nomeTabela) {
    setCriandoTabela(true); setErro("");
    try {
      await cadastrarTabelaVenda(nomeTabela);
      await carregarTabelas();
      setTabela(nomeTabela);
      setShowModal(false);
      setSucesso(`Tabela "${nomeTabela}" criada.`);
    } catch (e) {
      setErro(e?.response?.data?.message || e?.message || "Erro ao criar tabela");
      setShowModal(false);
    } finally { setCriandoTabela(false); }
  }

  const temEdicoes = Object.keys(edits).length > 0;
  const qtdEdicoes = Object.keys(edits).length;
  const versaoAtual = dataMaisRecente ? versaoMap.get(dataMaisRecente) : null;

  return (
    <div className="page">
      {showModal && (
        <ModalNovaTabela
          onConfirmar={handleCriarTabela}
          onCancelar={() => setShowModal(false)}
          salvando={criandoTabela}
        />
      )}

      <div className="headerYellow">
        PRECOS VENDA - {tabela}
        {versaoAtual && <span className="versaoBadge">v{versaoAtual}</span>}
      </div>

      <div className="conteudo">
        <div className="card">

          <div className="body">
            <div className="cabecalhoTabela">
              <div className="nomeProduto">Produto</div>
              {datas.map((d, idx) => (
                <th key={d} className="th" /* style={idx === 0 ? { borderBottom: "2px solid #FACC15" } : {}} */>
                  {d}
                </th>
              ))}
              {/* <div className="nomeProduto">Produto</div> */}
            </div>
            <div className="tableWrap">
              {loading && <div className="status">Carregando...</div>}
              {!loading && erro && <div className="status error">{erro}</div>}
              {!loading && sucesso && <div className="status" style={{ color: "#16a34a" }}>{sucesso}</div>}

              {!loading && (
                <table className="table">
                  <thead>

                  </thead>
                  <tbody>
                    {produtos.map((nome, i) => (
                      <tr key={nome} className="trHover" style={{ background: i % 2 === 0 ? "#ffffff" : "#f4f4f5" }}>
                        <td className="td tdLeft">{nome}</td>
                        {datas.map((d, idx) => {
                          const current = valueMap.get(`${nome}__${d}`) ?? null;
                          const prevDate = datas[idx + 1];
                          const prev = prevDate ? (valueMap.get(`${nome}__${prevDate}`) ?? null) : null;
                          const trendClass = !usuarioComum && prevDate ? getTrendClass(current, prev) : "";
                          const isEditavel = idx === 0 && !usuarioComum;
                          const valorEdit = edits[nome];
                          const displayValue = valorEdit !== undefined ? valorEdit : formatBRL(current);
                          return (
                            <td key={d} className={`td ${trendClass}`} /*style={idx === 0 ? { background: "rgba(250,204,21,0.04)" } : {}}*/>
                              {isEditavel ? (
                                <input
                                  className={`cellInput ${valorEdit !== undefined ? "cellInputDirty" : ""}`}
                                  value={displayValue}
                                  onChange={(e) => handleCellChange(nome, e.target.value)}
                                  onFocus={(e) => e.target.select()}
                                  onBlur={(e) => handleCellBlur(nome, e.target.value)}
                                />
                              ) : displayValue}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>


          </div>
        </div>

        <div className="side">
          <div className="sideLabel">Selecione a tabela:</div>
          <select className="select" value={tabela} onChange={(e) => setTabela(e.target.value)} disabled={loading}>
            {tabelas.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>

          {!usuarioComum && (
            <button className="btnNovaTabela" onClick={() => setShowModal(true)} disabled={loading}>
              + Nova tabela
            </button>
          )}

          <div className="hint">
            {loading ? "Atualizando..." : `${produtos.length} produto(s) · ${datas.length} versao(oes)`}
          </div>

          {!usuarioComum && (
            <>
              <button
                className={`btnSalvar ${temEdicoes ? "btnSalvarAtivo" : ""}`}
                onClick={handleSalvar}
                disabled={salvando || loading || !temEdicoes}
              >
                {salvando ? "Salvando..." : "Salvar precos de hoje"}
              </button>
              {temEdicoes && <div className="hint hintWarning">{qtdEdicoes} preco(s) alterado(s)</div>}
              <button className="btnCancelar" onClick={() => setEdits({})} disabled={!temEdicoes || salvando}>
                Cancelar edicoes
              </button>
            </>
          )}

          {/* Botão para ir para Tabelas Cliente */}
          <div style={{ marginTop: "auto", paddingTop: "16px", borderTop: "1px solid gainsboro" }}>
            <button className="btnCompra" onClick={onIrParaCompra}>
              Tabelas Cliente
            </button>
          </div>
        </div>
      </div>

    </div>

  );
}
