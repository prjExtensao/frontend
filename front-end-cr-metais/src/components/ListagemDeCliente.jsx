import React, { useState, useEffect } from "react";
import Tippy from "@tippyjs/react";
import "tippy.js/dist/tippy.css";
import { FaEdit, FaTrashAlt } from "react-icons/fa";
import styles from "../styles/Clientes.module.css"; 
import { listarClientes, deletarCliente } from "../services/clienteService";
import DetalheClienteModal from "./DetalheClienteModal";

export default function ListaClientes({ filtroNome }) {
  const [clientes, setClientes] = useState([]);
  const [ordenacao, setOrdenacao] = useState({ campo: "idCliente", direcao: "asc" });
  
  // Estados para controle do Modal de Detalhes
  const [isDetalheOpen, setIsDetalheOpen] = useState(false);
  const [isDetalheClosing, setIsDetalheClosing] = useState(false);
  const [clienteDetalheId, setClienteDetalheId] = useState(null);

  // Estados para controle dos Modais de Cadastro/Edição (mantenha os gatilhos se usar no componente pai)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEditClosing, setIsEditClosing] = useState(false);
  const [clienteEditandoId, setClienteEditandoId] = useState(null);

  // Busca os clientes ao carregar o componente
  const carregarClientes = async () => {
    try {
      const data = await listarClientes();
      setClientes(data || []);
    } catch (err) {
      console.error("Erro ao buscar clientes:", err);
    }
  };

  useEffect(() => {
    carregarClientes();
  }, []);

  // Controladores de Ordenação
  const ordenarPor = (campo) => {
    setOrdenacao((prev) => ({
      campo,
      direcao: prev.campo === campo && prev.direcao === "asc" ? "desc" : "asc",
    }));
  };

  const renderSeta = (campo) => {
    if (ordenacao.campo !== campo) return "↕";
    return ordenacao.direcao === "asc" ? "↑" : "↓";
  };

  // Ações do Grid
  async function excluirClienteItem(e, id) {
    e.stopPropagation(); // Evita abrir o modal de detalhes ao clicar no botão
    if (!window.confirm("Tem certeza que deseja excluir este cliente?")) return;
    try {
      await deletarCliente(id);
      setClientes((prev) => prev.filter((c) => c.idCliente !== id));
    } catch {
      alert("Erro ao excluir cliente.");
    }
  }

  function abrirEdicao(e, id) {
    e.stopPropagation(); // Evita abrir o modal de detalhes
    setClienteEditandoId(id);
    setIsEditModalOpen(true);
  }

  function abrirDetalhe(id) {
    setClienteDetalheId(id);
    setIsDetalheOpen(true);
  }

  function fecharDetalhe() {
    setIsDetalheClosing(true);
    setTimeout(() => {
      setIsDetalheOpen(false);
      setIsDetalheClosing(false);
      setClienteDetalheId(null);
    }, 300);
  }

  // Filtro defensivo e Ordenação dos dados
  const filtrados = clientes
    .filter((c) => {
      const termoFiltro = filtroNome ? filtroNome.toLowerCase() : "";
      const razaoSocialCliente = c.razaoSocial ? c.razaoSocial.toLowerCase() : "";
      return razaoSocialCliente.includes(termoFiltro);
    })
    .sort((a, b) => {
      const { campo, direcao } = ordenacao;
      let valorA, valorB;

      switch (campo) {
        case "idCliente": 
          valorA = a.idCliente; 
          valorB = b.idCliente; 
          break;
        case "razaoSocial": 
          valorA = a.razaoSocial?.toLowerCase() || ""; 
          valorB = b.razaoSocial?.toLowerCase() || ""; 
          break;
        case "cnpj": 
          valorA = a.cnpj?.toLowerCase() || ""; 
          valorB = b.cnpj?.toLowerCase() || ""; 
          break;
        case "tabelaPreco": 
          // Ordena com base no nome de texto da tabela de preço aninhada
          valorA = a.tabelaPreco?.nomeTabela?.toLowerCase() || ""; 
          valorB = b.tabelaPreco?.nomeTabela?.toLowerCase() || ""; 
          break;
        default: 
          return 0;
      }

      if (valorA < valorB) return direcao === "asc" ? -1 : 1;
      if (valorA > valorB) return direcao === "asc" ? 1 : -1;
      return 0;
    });

  return (
    <>
      {/* Modal de Detalhes Integrado */}
      <DetalheClienteModal 
        isOpen={isDetalheOpen} 
        isClosing={isDetalheClosing} 
        onClose={fecharDetalhe} 
        clienteId={clienteDetalheId} 
      />

      <div className={styles.listaClientesGrid}>
        {/* Cabeçalho da Tabela */}
        <div className={styles.clientesHeader}>
          <span className={styles.headerSortable} onClick={() => ordenarPor("idCliente")}>
            ID {renderSeta("idCliente")}
          </span>
          <span className={`${styles.clienteNome} ${styles.headerSortable}`} onClick={() => ordenarPor("razaoSocial")}>
            Razão Social {renderSeta("razaoSocial")}
          </span>
          <span className={`${styles.clienteResponsavel} ${styles.headerSortable}`} onClick={() => ordenarPor("cnpj")}>
            CNPJ {renderSeta("cnpj")}
          </span>
          <span className={`${styles.clienteTabela} ${styles.headerSortable}`} onClick={() => ordenarPor("tabelaPreco")}>
            Tabela {renderSeta("tabelaPreco")}
          </span>
          <span className={styles.clienteTabela}>Ações</span>
        </div>

        {/* Linhas de Dados */}
        <div className={styles.clientesLista}>
          {filtrados.length === 0 ? (
            <p style={{ padding: "20px", color: "#6b7280" }}>Nenhum cliente encontrado</p>
          ) : (
            filtrados.map((c, index) => (
              <div
                key={c.idCliente}
                className={`${styles.clienteLine} ${index % 2 === 0 ? styles.linhaPar : styles.linhaImpar}`}
                onClick={() => abrirDetalhe(c.idCliente)}
                style={{ cursor: "pointer" }}
              >
                <div className={styles.clienteItem}>
                  <span className={styles.clienteId}>{c.idCliente}</span>
                  <span className={styles.clienteNome}>{c.razaoSocial}</span>
                  <span className={styles.clienteResponsavel}>{c.cnpj || "-"}</span>
                  
                  {/* PUXANDO A TABELA DE CADA UM DOS CLIENTES DINAMICAMENTE */}
                  <span className={styles.clienteTabela}>
                    {c.tabelaPreco?.nomeTabela || "-"}
                  </span>

                  {/* Coluna de Ações */}
                  <div className={styles.clienteEdicao}>
                    <Tippy content="Editar cliente" theme="light">
                      <span className={`${styles.acao} ${styles.editar}`} onClick={(e) => abrirEdicao(e, c.idCliente)}>
                        <FaEdit className={styles.editIcon} />
                      </span>
                    </Tippy>
                    <Tippy content="Excluir cliente" theme="light">
                      <span className={`${styles.acao} ${styles.excluir}`} onClick={(e) => excluirClienteItem(e, c.idCliente)}>
                        <FaTrashAlt className={styles.trashAlt} />
                      </span>
                    </Tippy>
                  </div>
                </div>
                <div className={styles.divisao} />
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}