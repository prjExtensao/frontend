import styles from "../styles/Resumo.module.css";
import { useState, useEffect } from "react";
import { api } from "../services/resumoService";
import { FaSearch } from "react-icons/fa";

// const EstoqueHeader = () => {
//   return (
//     <div className={styles.estoqueHeader}>
//       <span className={styles.estoqueProduto}>Produto</span>
//       <span className={styles.estoquePeso}>Peso (Kg)</span>
//       <span className={styles.estoqueValor}>Valor Unitário (R$)</span>
//       <span className={styles.estoqueTotal}>Total (R$)</span>
//       <span className={styles.estoqueDestino}>Destino</span>
//     </div>
//   );
// };

const EstoqueHeader = ({ ordenarPor, ordenacao }) => {
  const renderSeta = (campo) => {
    if (ordenacao.campo !== campo) {
      return "↕";
    }

    return ordenacao.direcao === "asc" ? "↑" : "↓";
  };

  return (
    <div className={styles.estoqueHeader}>
      <span
        className={styles.headerSortable}
        onClick={() => ordenarPor("nome")}
      >
        Produto {renderSeta("nome")}
      </span>

      <span
        className={styles.headerSortable}
        onClick={() => ordenarPor("peso")}
      >
        Peso (Kg) {renderSeta("peso")}
      </span>

      <span
        className={styles.headerSortable}
        onClick={() => ordenarPor("valor")}
      >
        Valor Unitário (R$) {renderSeta("valor")}
      </span>

      <span
        className={styles.headerSortable}
        onClick={() => ordenarPor("total")}
      >
        Total (R$) {renderSeta("total")}
      </span>

      <span
        className={styles.headerSortable}
        onClick={() => ordenarPor("destino")}
      >
        Destino {renderSeta("destino")}
      </span>
    </div>
  );
};

const EstoqueItem = ({ produto, isEven }) => {
  const total = produto.peso * produto.valor;

  return (
    <div
      className={`${styles.estoqueLine} ${
        isEven ? styles.linhaPar : styles.linhaImpar
      }`}
    >
      <div className={styles.estoqueItem}>
        <span className={styles.estoqueProduto}>{produto.nome}</span>
        <span className={styles.estoquePeso}>
          {`${produto.peso.toLocaleString("pt-BR")} Kg`}
        </span>
        <span className={styles.estoqueValor}>
          {produto.valor.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          })}
        </span>
        <span className={styles.estoqueTotal}>
          {total.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          })}
        </span>
        <span className={styles.estoqueDestino}>
          {produto.destino || " - "}
        </span>
      </div>
      <div className={styles.divisao}></div>
    </div>
  );
};

const ResumoCard = ({ titulo, valor }) => {
  return (
    <div className={styles.resumoCard}>
      <span className={styles.resumoTitulo}>{titulo}</span>
      <h3>{valor}</h3>
    </div>
  );
};

const Resumo = () => {
  const [resumo, setResumo] = useState(null);
  const [busca, setBusca] = useState("");

  const [ordenacao, setOrdenacao] = useState({
    campo: "nome",
    direcao: "asc",
  });

  useEffect(() => {
    document.title = "CR Metais | Resumo";
  }, []);

  useEffect(() => {
    api
      .get("/resumos")
      .then((res) => {
        console.log("Resposta da API:", res.data);
        setResumo(res.data);
      })
      .catch((err) => console.error("Erro ao buscar produtos:", err));
  }, []);

  if (!resumo) {
    return <p>Carregando...</p>;
  }

  const termo = busca.toLowerCase().trim();

  // Preserva o índice original para manter as listras corretas após o filtro
  // const produtosFiltrados = resumo.produtos
  //   .map((produto, originalIndex) => ({ produto, originalIndex }))
  //   .filter(({ produto }) =>
  //     !termo || produto.nome?.toLowerCase().includes(termo)
  //   );

  const produtosFiltrados = resumo.produtos
  .filter(
    (produto) =>
      !termo || produto.nome?.toLowerCase().includes(termo)
  )
  .sort((a, b) => {
    const { campo, direcao } = ordenacao;

    let valorA;
    let valorB;

    switch (campo) {
      case "nome":
        valorA = a.nome?.toLowerCase() || "";
        valorB = b.nome?.toLowerCase() || "";
        break;

      case "peso":
        valorA = a.peso;
        valorB = b.peso;
        break;

      case "valor":
        valorA = a.valor;
        valorB = b.valor;
        break;

      case "total":
        valorA = a.peso * a.valor;
        valorB = b.peso * b.valor;
        break;

      case "destino":
        valorA = a.destino?.toLowerCase() || "";
        valorB = b.destino?.toLowerCase() || "";
        break;

      default:
        return 0;
    }

    if (valorA < valorB) {
      return direcao === "asc" ? -1 : 1;
    }

    if (valorA > valorB) {
      return direcao === "asc" ? 1 : -1;
    }

    return 0;
  });

  // Ordenação  
  const ordenarPor = (campo) => {
    let direcao = "asc";

    if (
      ordenacao.campo === campo &&
      ordenacao.direcao === "asc"
    ) {
      direcao = "desc";
    }

    setOrdenacao({ campo, direcao });
  }; 

  return (
    <div className={styles.conteudo}>
      <div className={styles.titulo}>
        <span className={styles.estoqueTitulo}>Estoque atual</span>
        <span className={styles.subtitulo}>
          Visão geral dos produtos em estoque
        </span>
      </div>

      <div className={styles.containers}>
        <div className={styles.leftSide}>
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

          <div className={styles.estoqueGrid}>
            <EstoqueHeader
              ordenarPor={ordenarPor}
              ordenacao={ordenacao}
            />

            <div className={styles.estoqueLista}>
              {produtosFiltrados.length > 0 ? (
                produtosFiltrados.map((produto, index) => (
                  <EstoqueItem
                    key={index}
                    produto={produto}
                    isEven={index % 2 === 0}
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

        <div className={styles.rightSide}>
          <div className={styles.containerCards}>
            <ResumoCard
              titulo="Total Aplicado:"
              valor={resumo.totalAplicado.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            />
            <ResumoCard
              titulo="Peso Total:"
              valor={`${resumo.pesoTotal.toLocaleString("pt-BR")} Kg`}
            />
            <ResumoCard
              titulo="Pg Notas (hoje):"
              valor={resumo.notasHoje.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            />
            <ResumoCard
              titulo="Peso Kg (hoje):"
              valor={`${resumo.pesoHoje.toLocaleString("pt-BR")} Kg`}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Resumo;