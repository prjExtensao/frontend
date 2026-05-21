import React, { useState, useEffect } from "react";
import styles from "../styles/Clientes.module.css";
import { API_URL } from "../services/apiClient";
import { listarClientes, deletarCliente } from "../services/clienteService";
import { FaTrashAlt, FaEdit, FaSearch } from "react-icons/fa";
import Tippy from "@tippyjs/react";
import "tippy.js/dist/tippy.css";
import "tippy.js/themes/light.css";

// Modais de Fornecedor
import NovoFornecedorModal from "./NovoFornecedorModal";
import EditarFornecedorModal from "./EditarFornecedorModal";
import DetalheFornecedorModal from "./DetalheFornecedorModal";

// Modais de Cliente
import NovoClienteModal from "./NovoClienteModal";
import EditarClienteModal from "./EditarClienteModal";

// ─────────────────────────────────────────────
// Sub-componente: listagem de FORNECEDORES
// ─────────────────────────────────────────────
function ListaFornecedores({ filtroNome }) {
  const [fornecedores, setFornecedores] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEditClosing, setIsEditClosing] = useState(false);
  const [fornecedorEditandoId, setFornecedorEditandoId] = useState(null);
  const [ordenacao, setOrdenacao] = useState({ campo: "idFornecedor", direcao: "asc" });
  const [isDetalheOpen, setIsDetalheOpen] = useState(false);
  const [isDetalheClosing, setIsDetalheClosing] = useState(false);
  const [fornecedorDetalheId, setFornecedorDetalheId] = useState(null);

  const carregarFornecedores = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/fornecedores`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setFornecedores(data || []);
    } catch (err) {
      console.error("Erro ao buscar fornecedores:", err);
    }
  };

  useEffect(() => { carregarFornecedores(); }, []);

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

  async function excluirFornecedor(e, id) {
    e.stopPropagation();
    if (!window.confirm("Tem certeza que deseja excluir este fornecedor?")) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/fornecedores/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      setFornecedores((prev) => prev.filter((f) => f.idFornecedor !== id));
    } catch {
      alert("Erro ao excluir fornecedor.");
    }
  }

  function abrirEdicao(e, id) {
    e.stopPropagation();
    setFornecedorEditandoId(id);
    setIsEditModalOpen(true);
  }

  function fecharEdicao() {
    setIsEditClosing(true);
    setTimeout(() => {
      setIsEditModalOpen(false);
      setIsEditClosing(false);
      setFornecedorEditandoId(null);
    }, 300);
  }

  function handleClose() {
    setIsClosing(true);
    setTimeout(() => {
      setIsModalOpen(false);
      setIsClosing(false);
    }, 300);
  }

  function abrirDetalhe(id) {
    setFornecedorDetalheId(id);
    setIsDetalheOpen(true);
  }

  function fecharDetalhe() {
    setIsDetalheClosing(true);
    setTimeout(() => {
      setIsDetalheOpen(false);
      setIsDetalheClosing(false);
      setFornecedorDetalheId(null);
    }, 300);
  }

  const filtrados = fornecedores
    .filter((f) => f.nome?.toLowerCase().includes(filtroNome.toLowerCase()))
    .sort((a, b) => {
      const { campo, direcao } = ordenacao;
      let valorA, valorB;
      switch (campo) {
        case "idFornecedor": valorA = a.idFornecedor; valorB = b.idFornecedor; break;
        case "nome": valorA = a.nome?.toLowerCase() || ""; valorB = b.nome?.toLowerCase() || ""; break;
        case "responsavel": valorA = a.responsavel?.nome?.toLowerCase() || ""; valorB = b.responsavel?.nome?.toLowerCase() || ""; break;
        case "tabela": valorA = a.tabelaPreco?.nomeTabela?.toLowerCase() || ""; valorB = b.tabelaPreco?.nomeTabela?.toLowerCase() || ""; break;
        default: return 0;
      }
      if (valorA < valorB) return direcao === "asc" ? -1 : 1;
      if (valorA > valorB) return direcao === "asc" ? 1 : -1;
      return 0;
    });

  return (
    <>
      <div style={{ display: "none" }}>
        <button id="btn-cadastrar-fornecedor-trigger" onClick={() => setIsModalOpen(true)} />
      </div>

      <NovoFornecedorModal isOpen={isModalOpen} isClosing={isClosing} onClose={handleClose} onSuccess={carregarFornecedores} />
      <EditarFornecedorModal isOpen={isEditModalOpen} isClosing={isEditClosing} onClose={fecharEdicao} fornecedorId={fornecedorEditandoId} onSuccess={carregarFornecedores} />
      <DetalheFornecedorModal isOpen={isDetalheOpen} isClosing={isDetalheClosing} onClose={fecharDetalhe} fornecedorId={fornecedorDetalheId} />

      <div className={styles.listaClientesGrid}>
        <div className={styles.clientesHeader}>
          <span className={styles.headerSortable} onClick={() => ordenarPor("idFornecedor")}>ID {renderSeta("idFornecedor")}</span>
          <span className={`${styles.clienteNome} ${styles.headerSortable}`} onClick={() => ordenarPor("nome")}>Nome {renderSeta("nome")}</span>
          <span className={`${styles.clienteResponsavel} ${styles.headerSortable}`} onClick={() => ordenarPor("responsavel")}>Responsável {renderSeta("responsavel")}</span>
          <span className={`${styles.clienteTabela} ${styles.headerSortable}`} onClick={() => ordenarPor("tabela")}>Tabela {renderSeta("tabela")}</span>
          <span className={styles.clienteTabela}>Ações</span>
        </div>

        <div className={styles.clientesLista}>
          {filtrados.length === 0 ? (
            <p style={{ padding: "20px", color: "#6b7280" }}>Nenhum fornecedor encontrado</p>
          ) : (
            filtrados.map((f, index) => (
              <div
                key={f.idFornecedor}
                className={`${styles.clienteLine} ${index % 2 === 0 ? styles.linhaPar : styles.linhaImpar}`}
                onClick={() => abrirDetalhe(f.idFornecedor)}
                style={{ cursor: "pointer" }}
              >
                <div className={styles.clienteItem}>
                  <span className={styles.clienteId}>{f.idFornecedor}</span>
                  <span className={styles.clienteNome}>{f.nome}</span>
                  <span className={styles.clienteResponsavel}>{f.responsavel?.nome || "-"}</span>
                  <span className={styles.clienteTabela}>{f.tabelaPreco?.nomeTabela || "-"}</span>
                  <div className={styles.clienteEdicao}>
                    <Tippy content="Editar fornecedor" theme="light">
                      <span className={`${styles.acao} ${styles.editar}`} onClick={(e) => abrirEdicao(e, f.idFornecedor)}>
                        <FaEdit className={styles.editIcon} />
                      </span>
                    </Tippy>
                    <Tippy content="Excluir fornecedor" theme="light">
                      <span className={`${styles.acao} ${styles.excluir}`} onClick={(e) => excluirFornecedor(e, f.idFornecedor)}>
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

// ─────────────────────────────────────────────
// Sub-componente: listagem de CLIENTES
// ─────────────────────────────────────────────
function ListaClientes({ filtroNome }) {
  const [clientes, setClientes] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEditClosing, setIsEditClosing] = useState(false);
  const [clienteEditandoId, setClienteEditandoId] = useState(null);
  const [ordenacao, setOrdenacao] = useState({ campo: "idCliente", direcao: "asc" });
  const [isDetalheOpen, setIsDetalheOpen] = useState(false);
  const [isDetalheClosing, setIsDetalheClosing] = useState(false);
  const [clienteDetalheId, setClienteDetalheId] = useState(null);

  const carregarClientes = async () => {
    try {
      const data = await listarClientes();
      setClientes(data || []);
    } catch (err) {
      console.error("Erro ao buscar clientes:", err);
    }
  };

  useEffect(() => { carregarClientes(); }, []);

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

  async function excluirClienteItem(e, id) {
    e.stopPropagation();
    if (!window.confirm("Tem certeza que deseja excluir este cliente?")) return;
    try {
      await deletarCliente(id);
      setClientes((prev) => prev.filter((c) => c.idCliente !== id));
    } catch {
      alert("Erro ao excluir cliente.");
    }
  }

  function abrirEdicao(e, id) {
    e.stopPropagation();
    setClienteEditandoId(id);
    setIsEditModalOpen(true);
  }

  function fecharEdicao() {
    setIsEditClosing(true);
    setTimeout(() => {
      setIsEditModalOpen(false);
      setIsEditClosing(false);
      setClienteEditandoId(null);
    }, 300);
  }

  function handleClose() {
    setIsClosing(true);
    setTimeout(() => {
      setIsModalOpen(false);
      setIsClosing(false);
    }, 300);
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

  const filtrados = clientes
    .filter((c) => c.razaoSocial?.toLowerCase().includes(filtroNome.toLowerCase()))
    .sort((a, b) => {
      const { campo, direcao } = ordenacao;
      let valorA, valorB;
      switch (campo) {
        case "idCliente": valorA = a.idCliente; valorB = b.idCliente; break;
        case "razaoSocial": valorA = a.razaoSocial?.toLowerCase() || ""; valorB = b.razaoSocial?.toLowerCase() || ""; break;
        case "tabelaPreco": valorA = a.tabelaPreco?.toLowerCase() || ""; valorB = b.tabelaPreco?.toLowerCase() || ""; break;
        default: return 0;
      }
      if (valorA < valorB) return direcao === "asc" ? -1 : 1;
      if (valorA > valorB) return direcao === "asc" ? 1 : -1;
      return 0;
    });

  return (
    <>
      <div style={{ display: "none" }}>
        <button id="btn-cadastrar-cliente-trigger" onClick={() => setIsModalOpen(true)} />
      </div>

      <NovoClienteModal isOpen={isModalOpen} isClosing={isClosing} onClose={handleClose} onSuccess={carregarClientes} />
      <EditarClienteModal isOpen={isEditModalOpen} isClosing={isEditClosing} onClose={fecharEdicao} clienteId={clienteEditandoId} onSuccess={carregarClientes} />
      {/*<DetalheClienteModal isOpen={isDetalheOpen} isClosing={isDetalheClosing} onClose={fecharDetalhe} clienteId={clienteDetalheId} />*/}

      <div className={styles.listaClientesGrid}>
        <div className={styles.clientesHeader}>
          <span className={styles.headerSortable} onClick={() => ordenarPor("idCliente")}>ID {renderSeta("idCliente")}</span>
          <span className={`${styles.clienteNome} ${styles.headerSortable}`} onClick={() => ordenarPor("razaoSocial")}>Razão Social {renderSeta("razaoSocial")}</span>
          <span className={styles.clienteResponsavel}>Responsável</span>
          <span className={`${styles.clienteTabela} ${styles.headerSortable}`} onClick={() => ordenarPor("tabelaPreco")}>Tabela {renderSeta("tabelaPreco")}</span>
          <span className={styles.clienteTabela}>Ações</span>
        </div>

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
                  <span className={styles.clienteResponsavel}>{c.responsavel || "-"}</span>
                  <span className={styles.clienteTabela}>{c.tabelaPreco || "-"}</span>
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

// ─────────────────────────────────────────────
// Componente principal com barra integrada
// ─────────────────────────────────────────────
export default function ListagemDeCliente() {
  const [visao, setVisao] = useState("fornecedores");
  const [filtroNome, setFiltroNome] = useState("");

  useEffect(() => {
    document.title = "CR Metais | Fornecedores & Clientes";
  }, []);

  const alternarVisao = () => {
    setFiltroNome("");
    setVisao((prev) => (prev === "fornecedores" ? "clientes" : "fornecedores"));
  };

  const handleCadastrarClick = () => {
    if (visao === "fornecedores") {
      document.getElementById("btn-cadastrar-fornecedor-trigger")?.click();
    } else {
      document.getElementById("btn-cadastrar-cliente-trigger")?.click();
    }
  };

  return (
    <div className={styles.listaClientesContainer}>
      <div className={styles.cabecalho}>
        <div className={styles.titulos}>
          <span className={styles.titulo}>
            {visao === "fornecedores" ? "Fornecedores" : "Clientes"}
          </span>
          <span className={styles.subtitulo}>
            {visao === "fornecedores"
              ? "Veja aqui todos os fornecedores cadastrados e clique para cadastrar, editar ou excluir um fornecedor existente."
              : "Veja todos os clientes cadastrados e clique para cadastrar, editar ou excluir."}
          </span>
        </div>

        <div className={styles.cabecalhoLayoutNovo}>
          <div className={styles.searchContainerEsquerda}>
            <div className={styles.searchWrapper}>
              <FaSearch className={styles.searchIcon} />
              <input
                type="text"
                className={styles.searchInput}
                value={filtroNome}
                onChange={(e) => setFiltroNome(e.target.value)}
                placeholder={visao === "fornecedores" ? "Pesquisar por nome" : "Pesquisar por razão social"}
              />
              {filtroNome && (
                <button className={styles.searchClear} onClick={() => setFiltroNome("")} aria-label="Limpar busca">
                  ✕
                </button>
              )}
            </div>
          </div>

          <button className={styles.toggleBtnUnico} onClick={alternarVisao}>
            {visao === "fornecedores" ? "Clientes" : "Fornecedores"}
          </button>

          <button className={styles.btnCadastrarAmarelo} onClick={handleCadastrarClick}>
            {visao === "fornecedores" ? "Cadastrar fornecedor" : "Cadastrar cliente"}
          </button>
        </div>
      </div>

      <div className={styles.containerInfos}>
        {visao === "fornecedores" ? (
          <ListaFornecedores filtroNome={filtroNome} />
        ) : (
          <ListaClientes filtroNome={filtroNome} />
        )}
      </div>
    </div>
  );
}