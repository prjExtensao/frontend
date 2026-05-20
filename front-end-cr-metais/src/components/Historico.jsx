import React, { useState, useEffect, useRef, useCallback } from "react";
import styles from "../styles/Historico.module.css";
import { buscarHistorico } from "../services/histoticoService";
import { isUsuarioComum } from "../services/usuarioService";
import { baixarHistoricoCsv } from "../services/histoticoService";
import { FaSearch } from "react-icons/fa";

function Historico() {

  const PAGE_SIZE = 10;

  const [tableData, setTableData] = useState([]);
  const [tipoHistorico, setTipoHistorico] = useState("Entrada");
  const [loading, setLoading] = useState(false);
  const [pagina, setPagina] = useState(0);
  const [temMais, setTemMais] = useState(true);
  const [busca, setBusca] = useState("");

  const observer = useRef(null);
  const loadingRef = useRef(false);
  const usuarioComum = isUsuarioComum();
  const mostrarRendimento = !usuarioComum;
  const colunasGrid = mostrarRendimento
    ? "0.5fr 0.5fr 0.5fr 0.5fr 0.5fr 0.5fr 0.5fr 0.5fr 0.5fr"
    : "0.5fr 0.7fr 0.6fr 0.7fr 0.7fr 0.6fr 0.8fr 0.7fr";

  const [mostrarModal, setMostrarModal] = useState(false);
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  const HistoricoHeader = () => (
    <div className={styles.historicoHeader} style={{ gridTemplateColumns: colunasGrid }}>
      <span className={styles.idCompra}>ID Compra</span>
      <span className={styles.produto}>Produto</span>
      <span className={styles.peso}>Peso</span>
      <span className={styles.valor}>Valor</span>
      <span className={styles.total}>Total</span>
      {mostrarRendimento && <span className={styles.rendimento}>Rendimento</span>}
      <span className={styles.tipo}>Tipo</span>
      <span className={styles.parceiro}>Parceiro</span>
      <span className={styles.data}>Data</span>
    </div>
  );

  const formatarData = (data) => {
    return new Date(data).toLocaleDateString("pt-BR");
  };

  const HistoricoList = ({ produto, isEven, refProp }) => (
    <div
      ref={refProp}
      className={`${styles.historicoLine} ${isEven ? styles.linhaPar : styles.linhaImpar}`}
    >
      <div className={styles.item} style={{ gridTemplateColumns: colunasGrid }}>
        <span className={styles.idCompra}>{produto.id}</span>
        <span className={styles.produto}>{produto.produto}</span>

        <span className={styles.peso}>
          {produto.peso ? `${produto.peso.toLocaleString("pt-BR")} Kg` : ""}
        </span>

        <span className={styles.valor}>
          {produto.preco?.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          })}
        </span>

        <span className={styles.total}>
          {produto.total?.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          })}
        </span>

        {mostrarRendimento && (
          <span className={styles.rendimento}>
            {produto.rendimento
              ? produto.rendimento.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })
              : "-"}
          </span>
        )}

        <span className={styles.tipo}>{produto.tipo}</span>
        <span className={styles.parceiro}>{produto.parceiro}</span>

        <span className={styles.data}>
          {produto.data ? formatarData(produto.data) : ""}
        </span>
      </div>
    </div>
  );

  // 🔥 FUNÇÃO DE CARREGAMENTO
  const carregarDados = useCallback(async (paginaAtual) => {
    if (loadingRef.current) return;

    loadingRef.current = true;
    setLoading(true);

    try {
      const tipoApi = tipoHistorico === "Entrada" ? "COMPRA" : "VENDA";
      const data = await buscarHistorico(tipoApi, paginaAtual, PAGE_SIZE);
      const novosDados = data.content;

      setTableData(prev =>
        paginaAtual === 0 ? novosDados : [...prev, ...novosDados]
      );

      setTemMais(novosDados.length === PAGE_SIZE);
      setPagina(prev => prev + 1);

    } catch (error) {
      console.error("Erro no componente:", error);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [tipoHistorico]);

  // 🔥 OBSERVER
  const lastElementRef = useCallback(node => {
    if (loadingRef.current) return;
    if (observer.current) observer.current.disconnect();

    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && temMais) {
        carregarDados(pagina);
      }
    });

    if (node) observer.current.observe(node);
  }, [temMais, carregarDados, pagina]);

  const baixarCsv = async () => {
    try {
      const tipo = tipoHistorico === "Entrada" ? "COMPRA" : "VENDA";
      const urlDownload = await baixarHistoricoCsv(tipo, dataInicio, dataFim);

      const link = document.createElement("a");
      link.href = urlDownload;
      link.download = `historico-${tipo}-${dataInicio}-a-${dataFim}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setMostrarModal(false);
    } catch (error) {
      console.error("Erro ao gerar CSV:", error);
      alert("Não foi possível gerar o CSV. Tente novamente.");
    }
  };

  // 🔥 RESET TOTAL AO TROCAR TIPO
  useEffect(() => {
    document.title = "CR Metais | Histórico";

    setTableData([]);
    setPagina(0);
    setTemMais(true);
    loadingRef.current = false;

    setTimeout(() => {
      carregarDados(0);
    }, 0);
  }, [tipoHistorico]);

  // Filtro por produto ou parceiro (client-side, sobre os dados já carregados)
  const termo = busca.toLowerCase().trim();
  const dadosFiltrados = tableData
    .map((item, originalIndex) => ({ item, originalIndex }))
    .filter(({ item }) => {
      if (!termo) return true;
      const produtoMatch = item.produto?.toLowerCase().includes(termo);
      const parceiroMatch = item.parceiro?.toLowerCase().includes(termo);
      return produtoMatch || parceiroMatch;
    });

  return (
    <div className={styles.containerPrincipal}>
      <main className={styles.conteudoPrincipal}>

        <div className={styles.barraTitulo}>
          <div className={styles.titulos}>
            <h1 className={styles.titulo}>
              Histórico de {tipoHistorico}
            </h1>
            <span className={styles.subtitulo}>
              Alterne a visualização clicando em{" "}
              <b>
                Alternar para {tipoHistorico === "Entrada" ? "Saída" : "Entrada"}
              </b>
            </span>
          </div>

          <div className={styles.containerBotoes}>
            <div className={styles.searchWrapper}>
              <FaSearch className={styles.searchIcon} />
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Buscar por produto ou parceiro..."
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

            <button
              className={styles.botaoCsv}
              onClick={() => setMostrarModal(true)}
            >
              Baixar CSV
            </button>

            <button
              className={styles.selectHistorico}
              onClick={() =>
                setTipoHistorico(prev =>
                  prev === "Entrada" ? "Saída" : "Entrada"
                )
              }
            >
              Alternar para {tipoHistorico === "Entrada" ? "Saída" : "Entrada"}
            </button>
          </div>
        </div>

        <div className={styles.historicoGrid}>
          <HistoricoHeader />

          <div className={styles.historicoLista}>
            {dadosFiltrados.length > 0 ? (
              dadosFiltrados.map(({ item, originalIndex }, filteredIndex) => {
                const isLast = filteredIndex === dadosFiltrados.length - 1;
                return (
                  <HistoricoList
                    key={`${item.id}-${originalIndex}`}
                    produto={item}
                    isEven={originalIndex % 2 === 0}
                    refProp={isLast && !termo ? lastElementRef : undefined}
                  />
                );
              })
            ) : (
              termo ? (
                <div className={styles.semResultados}>
                  Nenhum resultado encontrado para &quot;{busca}&quot;
                </div>
              ) : null
            )}
          </div>

          {loading && <p className={styles.carregando}>Carregando...</p>}
        </div>

        {mostrarModal && (
          <div className={styles.modalOverlay}>
            <div className={styles.modalCalendario}>

              <h2 className={styles.modalTitulo}>Selecionar período</h2>

              <div className={styles.date_filter}>
                <div>
                  <p className={styles.tit_data}>Data inicial</p>
                  <input
                    className={styles.input}
                    type="date"
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                  />
                </div>

                <div>
                  <p className={styles.tit_data}>Data final</p>
                  <input
                    className={styles.input}
                    type="date"
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                  />
                </div>
              </div>

              <div className={styles.modalBotoes}>
                <button onClick={() => setMostrarModal(false)}>
                  Cancelar
                </button>
                <button onClick={() => baixarCsv()}>
                  Confirmar
                </button>
              </div>

            </div>
          </div>
        )}

      </main>
    </div>
  );
}

export default Historico;