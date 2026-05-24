import styles from "../styles/Resumo.module.css";
import { useState, useEffect, useMemo } from "react";
import { api } from "../services/resumoService";
import { FaSearch } from "react-icons/fa";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBRL(valor) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatKg(valor) {
  return `${valor.toLocaleString("pt-BR")} Kg`;
}

// ─── Header da tabela ─────────────────────────────────────────────────────────

const EstoqueHeader = ({ ordenarPor, ordenacao }) => {
  const seta = (campo) => {
    if (ordenacao.campo !== campo) return "↕";
    return ordenacao.direcao === "asc" ? "↑" : "↓";
  };

  return (
    <div className={styles.estoqueHeader}>
      <span className={styles.headerSortable} onClick={() => ordenarPor("nome")}>
        Produto {seta("nome")}
      </span>
      <span className={styles.headerSortable} onClick={() => ordenarPor("peso")}>
        Peso (Kg) {seta("peso")}
      </span>
      <span className={styles.headerSortable} onClick={() => ordenarPor("valor")}>
        Valor Unitário (R$) {seta("valor")}
      </span>
      <span className={styles.headerSortable} onClick={() => ordenarPor("total")}>
        Total (R$) {seta("total")}
      </span>
      <span className={styles.headerSortable} onClick={() => ordenarPor("destino")}>
        Destino {seta("destino")}
      </span>
    </div>
  );
};

// ─── Item da tabela ───────────────────────────────────────────────────────────

const EstoqueItem = ({ produto, isEven, precoUnitario, destino }) => {
  const total = precoUnitario != null
    ? produto.materialDisponivel * precoUnitario
    : null;

  return (
    <div className={`${styles.estoqueLine} ${isEven ? styles.linhaPar : styles.linhaImpar}`}>
      <div className={styles.estoqueItem}>
        <span className={styles.estoqueProduto}>{produto.nome}</span>
        <span className={styles.estoquePeso}>{formatKg(produto.materialDisponivel)}</span>
        <span className={styles.estoqueValor}>
          {precoUnitario != null ? formatBRL(precoUnitario) : "—"}
        </span>
        <span className={styles.estoqueTotal}>
          {total != null ? formatBRL(total) : "—"}
        </span>
        <span className={styles.estoqueDestino}>{destino || "—"}</span>
      </div>
      <div className={styles.divisao} />
    </div>
  );
};

// ─── Card lateral ─────────────────────────────────────────────────────────────

const ResumoCard = ({ titulo, valor }) => (
  <div className={styles.resumoCard}>
    <span className={styles.resumoTitulo}>{titulo}</span>
    <h3>{valor}</h3>
  </div>
);

// ─── Componente principal ─────────────────────────────────────────────────────

const Resumo = () => {
  const [resumo, setResumo]         = useState(null);
  const [busca, setBusca]           = useState("");
  const [clienteSel, setClienteSel] = useState("");
  const [ordenacao, setOrdenacao]   = useState({ campo: "nome", direcao: "asc" });

  useEffect(() => { document.title = "CR Metais | Resumo"; }, []);

  useEffect(() => {
    api.get("/resumos")
      .then((res) => setResumo(res.data))
      .catch((err) => console.error("Erro ao buscar resumo:", err));
  }, []);

  // Mapa: nomeTabela → { nomeProduto → precoProduto }
  const tabelaMap = useMemo(() => {
    if (!resumo?.tabelasPreco) return {};
    const map = {};
    for (const item of resumo.tabelasPreco) {
      if (!map[item.nomeTabela]) map[item.nomeTabela] = {};
      map[item.nomeTabela][item.nomeProduto] = item.precoProduto;
    }
    return map;
  }, [resumo]);

  // Preços do cliente selecionado
  const precosCliente = useMemo(() => {
    if (!clienteSel) return {};
    const chave = Object.keys(tabelaMap).find(
      (k) => k.toLowerCase() === clienteSel.toLowerCase()
    );
    return chave ? tabelaMap[chave] : {};
  }, [clienteSel, tabelaMap]);

  const ordenarPor = (campo) => {
    setOrdenacao((prev) => ({
      campo,
      direcao: prev.campo === campo && prev.direcao === "asc" ? "desc" : "asc",
    }));
  };

  if (!resumo) return <p>Carregando...</p>;

  const termo = busca.toLowerCase().trim();

  const produtosFiltrados = resumo.produtos
    .filter((p) => !termo || p.nome?.toLowerCase().includes(termo))
    .sort((a, b) => {
      const { campo, direcao } = ordenacao;
      let va, vb;
      switch (campo) {
        case "nome":
          va = a.nome?.toLowerCase() || "";
          vb = b.nome?.toLowerCase() || "";
          break;
        case "peso":
          va = a.materialDisponivel;
          vb = b.materialDisponivel;
          break;
        case "valor":
          va = precosCliente[a.nome] ?? -1;
          vb = precosCliente[b.nome] ?? -1;
          break;
        case "total":
          va = a.materialDisponivel * (precosCliente[a.nome] ?? 0);
          vb = b.materialDisponivel * (precosCliente[b.nome] ?? 0);
          break;
        default:
          return 0;
      }
      if (va < vb) return direcao === "asc" ? -1 : 1;
      if (va > vb) return direcao === "asc" ? 1 : -1;
      return 0;
    });



  return (
    <div className={styles.conteudo}>

      {/* ── Título + select de destino ── */}
      <div className={styles.tituloBarra}>
        <div className={styles.titulo}>
          <span className={styles.estoqueTitulo}>Estoque atual</span>
          <span className={styles.subtitulo}>Visão geral dos produtos em estoque</span>
        </div>

        <div className={styles.destinoWrapper}>
          <span className={styles.destinoLabel}>Selecione o destino</span>
          <select
            className={styles.clienteSelect}
            value={clienteSel}
            onChange={(e) => setClienteSel(e.target.value)}
          >
            <option value="">—</option>
            {resumo.clientes.map((c) => (
              <option key={c.nome} value={c.nome}>{c.nome}</option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.containers}>
        <div className={styles.leftSide}>

          {/* Barra de busca */}
          <div className={styles.searchWrapper}>
            <FaSearch className={styles.searchIcon} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Buscar por produto..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
            {busca && (
              <button
                className={styles.searchClear}
                onClick={() => setBusca("")}
                aria-label="Limpar busca"
              >
                ✕
              </button>
            )}
          </div>

          {/* Tabela */}
          <div className={styles.estoqueGrid}>
            <EstoqueHeader ordenarPor={ordenarPor} ordenacao={ordenacao} />
            <div className={styles.estoqueLista}>
              {produtosFiltrados.length > 0 ? (
                produtosFiltrados.map((produto, index) => (
                  <EstoqueItem
                    key={produto.nome}
                    produto={produto}
                    isEven={index % 2 === 0}
                    precoUnitario={clienteSel ? (precosCliente[produto.nome] ?? null) : null}
                    destino={clienteSel || null}
                  />
                ))
              ) : (
                <div className={styles.semResultados}>
                  Nenhum produto encontrado para &quot;{busca}&quot;
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Cards laterais — apenas os 4 originais, sem card extra */}
        <div className={styles.rightSide}>
          <div className={styles.containerCards}>
            <ResumoCard
              titulo="Total Aplicado:"
              valor={formatBRL(resumo.totalAplicado)}
            />
            <ResumoCard
              titulo="Peso Total:"
              valor={formatKg(resumo.pesoTotal)}
            />
            <ResumoCard
              titulo="Pg Notas (hoje):"
              valor={formatBRL(resumo.notasHoje)}
            />
            <ResumoCard
              titulo="Peso Kg (hoje):"
              valor={formatKg(resumo.pesoHoje)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Resumo;
