import React, { useState, useEffect } from "react";
import "../styles/ListagemDeColaboradoresStyle.css";
import CadastroColaboradorModal from "./CadastroColaborador";
import { listarUsuarios, excluirUsuario, editarUsuario, getUsuarioLogadoId, isUsuarioComum, buscarUsuarioPorId, salvarUsuarioLogado } from "../services/usuarioService";

const ITENS_POR_PAGINA = 8;

const ColaboradorItem = ({ colaborador, onExcluir, onEditar, editando, dadosEditados, onDadosChange, onSalvar, onCancelar, usuarioLogadoId }) => {
  if (editando) {
    return (
      <div className="colaborador-line editando">
        <div className="colaborador-item">
          <input
            className="input-inline"
            value={dadosEditados.nome}
            onChange={(e) => onDadosChange({ ...dadosEditados, nome: e.target.value })}
            placeholder="Nome"
          />
          <input
            className="input-inline"
            value={dadosEditados.email}
            onChange={(e) => onDadosChange({ ...dadosEditados, email: e.target.value })}
            placeholder="E-mail"
          />
          <input
            className="input-inline"
            value={dadosEditados.cargo}
            onChange={(e) => onDadosChange({ ...dadosEditados, cargo: e.target.value })}
            placeholder="Cargo"
          />
          <div className="colaborador-acoes-container">
            <button className="btn-salvar-inline" onClick={onSalvar} title="Salvar">💾 Salvar</button>
            <button className="btn-cancelar-inline" onClick={onCancelar} title="Cancelar">✖ Cancelar</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="colaborador-line">
      <div className="colaborador-item">
        <span className="colaborador-nome">{colaborador.nome}</span>
        <span className="colaborador-email">{colaborador.email}</span>
        <span className="colaborador-cargo">{colaborador.cargo ?? "—"}</span>
        <div className="colaborador-acoes-container">
          <button className="btn-editar-inline" onClick={() => onEditar(colaborador)} title="Editar">✏️</button>
          <button
  className="btn-excluir-inline"
  onClick={() => onExcluir(colaborador.id)}
  title={colaborador.id === usuarioLogadoId ? "Você não pode excluir sua própria conta" : "Excluir"}
  disabled={colaborador.id === usuarioLogadoId}
>
  🗑️
</button>
        </div>
      </div>
    </div>
  );
};

const ListaColaboradores = () => {
  const usuarioComum = isUsuarioComum();
  const [colaboradores, setColaboradores] = useState([]);
  const [colaboradorParaEditar, setColaboradorParaEditar] = useState(null);
  const [dadosEditados, setDadosEditados] = useState({});
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [filtroNome, setFiltroNome] = useState("");

  const carregarUsuarios = async () => {
    try {
      const usuarios = await listarUsuarios();
      const usuariosFormatados = Array.isArray(usuarios) ? usuarios.map(u => ({
        id: u.idUsuario || u.id,
        nome: u.nome,
        email: u.email,
        cargo: u.cargo ?? "—"
      })) : [];
      setColaboradores(usuariosFormatados);
    } catch (erro) {
      console.error("Erro ao buscar usuários:", erro);
    }
  };

  useEffect(() => {
    carregarUsuarios();
    document.title = "CR Metais | Gestão de dados";
  }, []);

  const colaboradoresFiltrados = colaboradores.filter((colaborador) =>
    colaborador.nome?.toLowerCase().includes(filtroNome.toLowerCase())
  );

  const totalPaginas = Math.ceil(colaboradoresFiltrados.length / ITENS_POR_PAGINA);
  const indiceInicio = (paginaAtual - 1) * ITENS_POR_PAGINA;
  const colaboradoresPagina = colaboradoresFiltrados.slice(indiceInicio, indiceInicio + ITENS_POR_PAGINA);

  const prepararEdicao = (colaborador) => {
    setColaboradorParaEditar(colaborador.id);
    setDadosEditados({ ...colaborador });
  };

  const cancelarEdicao = () => {
    setColaboradorParaEditar(null);
    setDadosEditados({});
  };

  const excluirColaborador = async (id) => {
  const idLogado = getUsuarioLogadoId();

  if (id === idLogado) {
    alert("Você não pode excluir sua própria conta.");
    return;
  }

  if (!window.confirm("Deseja realmente excluir este colaborador?")) return;

  try {
    await excluirUsuario(id);
    await carregarUsuarios();
  } catch (erro) {
    if (erro.response?.status === 403) {
      alert("Você não pode excluir sua própria conta.");
    } else {
      alert("Erro ao excluir colaborador!");
    }
  }
};

  const salvarAlteracoes = async () => {
    try {
      const usuarioLogadoId = getUsuarioLogadoId();
      const eOMesmoUsuario = Number(dadosEditados.id) === usuarioLogadoId;

      const resposta = await editarUsuario(dadosEditados.id, {
        nome: dadosEditados.nome,
        email: dadosEditados.email,
        cargo: dadosEditados.cargo
      });

      if (eOMesmoUsuario && resposta.data?.token) {
        localStorage.setItem("token", resposta.data.token);
      }

      if (eOMesmoUsuario) {
        try {
          const usuarioCompleto = await buscarUsuarioPorId(dadosEditados.id);
          salvarUsuarioLogado(usuarioCompleto);
        } catch {
          salvarUsuarioLogado({
            idUsuario: dadosEditados.id,
            nome: dadosEditados.nome,
            email: dadosEditados.email,
            cargo: dadosEditados.cargo,
          });
        }
      }

      await carregarUsuarios();
      cancelarEdicao();
    } catch (erro) {
      if (erro.response?.status !== 401 && erro.response?.status !== 403) {
        alert("Erro ao salvar alterações!");
      }
    }
  };

  if (usuarioComum) {
    return null;
  }

  return (
    <div className="lista-colaboradores-page">
      <div className="lista-colaboradores-container">

        {/* HEADER: título + subtítulo à esquerda, busca à direita */}
        <div className="lista-colaboradores-header">
          <div className="container-titulo">
            <h1 className="lista-colaboradores-titulo">Colaboradores</h1>
            <span className="subtitulo">Veja aqui todos os Colaboradores cadastrados e clique para cadastrar, editar ou excluir um Colaborador existente.</span>
          </div>

          <div className="lista-colaboradores-top">
            <input
              type="text"
              className="search-input"
              value={filtroNome}
              onChange={(e) => {
                setFiltroNome(e.target.value);
                setPaginaAtual(1);
              }}
              placeholder="Pesquisar por nome"
            />
          </div>
        </div>

        <div className="colaborador-header">
          <span>Nome</span>
          <span>E-mail</span>
          <span>Cargo</span>
          <span>Ações</span>
        </div>

        <div className="lista-colaboradores-grid">
          {colaboradoresPagina.length === 0 ? (
            <p style={{ padding: "1rem", opacity: 0.5 }}>Nenhum colaborador encontrado.</p>
          ) : (
              colaboradoresPagina.map((colaborador) => (
                <ColaboradorItem
                  key={colaborador.id}
                  colaborador={colaborador}
                  usuarioLogadoId={getUsuarioLogadoId()}
                  editando={colaboradorParaEditar === colaborador.id}
                  dadosEditados={dadosEditados}
                  onDadosChange={setDadosEditados}
                  onEditar={prepararEdicao}
                  onExcluir={excluirColaborador}
                  onSalvar={salvarAlteracoes}
                  onCancelar={cancelarEdicao}
              />
            ))
          )}
        </div>

        {totalPaginas > 1 && (
          <div className="paginacao">
            <button
              className="paginacao-btn"
              onClick={() => setPaginaAtual(p => Math.max(1, p - 1))}
              disabled={paginaAtual === 1}
            >← Anterior</button>

            {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((num) => (
              <button
                key={num}
                className={`paginacao-btn ${paginaAtual === num ? "paginacao-btn-ativo" : ""}`}
                onClick={() => setPaginaAtual(num)}
              >{num}</button>
            ))}

            <button
              className="paginacao-btn"
              onClick={() => setPaginaAtual(p => Math.min(totalPaginas, p + 1))}
              disabled={paginaAtual === totalPaginas}
            >Próximo →</button>
          </div>
        )}
      </div>

      <CadastroColaboradorModal onCadastroSucesso={carregarUsuarios} />
    </div>
  );
};

export default ListaColaboradores;