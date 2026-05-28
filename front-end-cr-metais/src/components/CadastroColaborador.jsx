import React, { useState, useEffect, useRef } from "react";
import "../styles/CadastroColaboradorStyle.css";
import info from "../styles/img/yellow-bars-img.png";
import check from "../styles/img/check.png";
import logo from "../styles/img/LOGO.png";
import { cadastrarUsuario } from "../services/usuarioService";
import api from "../services/apiClient"; // ← único import novo

const SENHA_FORTE_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
const CACHE_KEY = "cadastro_colaborador_rascunho";

export default function CadastroClienteModal({ onCadastroSucesso }) {
  
  const [step, setStep] = useState(1);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [csenha, setCSenha] = useState("");
  const [cargo, setCargo] = useState("");
  const [erros, setErros] = useState({});

  // Impede salvar no Redis antes de terminar a leitura inicial
  const carregandoRascunho = useRef(true);

  // ── 1. Ao montar: busca rascunho do Redis ────────────────────────────────
  useEffect(() => {
    const buscarRascunho = async () => {
      try {
        const res = await api.get(`/api/cache/${CACHE_KEY}`)
        if (res.data) {
          if (res.data.nome)  setNome(res.data.nome);
          if (res.data.email) setEmail(res.data.email);
          if (res.data.cargo) setCargo(res.data.cargo);
          // senha jamais é restaurada
        }
      } catch {
        // 204 ou chave inexistente — sem rascunho salvo, comportamento normal
      } finally {
        carregandoRascunho.current = false;
      }
    };
    buscarRascunho();
  }, []);

  // ── 2. Persiste no Redis sempre que nome/email/cargo mudam ───────────────
  useEffect(() => {
    if (carregandoRascunho.current) return; // aguarda carga inicial

    const salvarRascunho = async () => {
      try {
        // ⚠️ senha NUNCA entra aqui
        await api.post(`/api/cache/${CACHE_KEY}`, { nome, email, cargo });
      } catch (err) {
        console.warn("Não foi possível salvar rascunho:", err);
      }
    };

    // Debounce de 800ms — evita uma chamada por tecla digitada
    const timer = setTimeout(salvarRascunho, 800);
    return () => clearTimeout(timer);
  }, [nome, email, cargo]);

  // ─── Validação em tempo real ─────────────────────────────────────────────
  useEffect(() => {
    let novosErros = {};
    if (nome.length > 0  && nome.trim().length <= 2)      novosErros.nome   = "Nome deve conter pelo menos 3 letras";
    if (email.length > 0 && !emailValido(email))          novosErros.email  = "Email inválido";
    if (senha.length > 0 && !SENHA_FORTE_REGEX.test(senha)) novosErros.senha = "Senha muito fraca (mín. 8 caracteres, maiúscula, minúscula, número e símbolo)";
    if (csenha.length > 0 && senha !== csenha)            novosErros.csenha = "As senhas não coincidem";
    if (cargo.length > 0 && cargo.trim().length === 0)    novosErros.cargo  = "Informe um cargo";
    setErros(novosErros);
  }, [nome, email, senha, csenha, cargo]);

  function emailValido(emailVal) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal);
  }

  function validarCampos() {
    let novosErros = {};
    if (nome.trim().length <= 2)          novosErros.nome   = "Nome inválido";
    if (!emailValido(email))              novosErros.email  = "Email inválido";
    if (!SENHA_FORTE_REGEX.test(senha))   novosErros.senha  = "Senha inválida";
    if (senha !== csenha)                 novosErros.csenha = "Senhas não coincidem";
    if (cargo.trim().length === 0)        novosErros.cargo  = "Cargo obrigatório";
    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  }

  async function enviarCadastro() {
    if (!validarCampos()) return;
    try {
      await cadastrarUsuario({ nome, email, senha, cargo });
      // ── 3. Sucesso: apaga o rascunho do Redis ────────────────────────────
      await api.delete(`/api/cache/${CACHE_KEY}`);
      setStep(2);
      if (onCadastroSucesso) onCadastroSucesso();
    } catch (erro) {
      console.error("Erro ao cadastrar:", erro.response?.data || erro);
      alert(erro.response?.data?.message || "Erro ao conectar com o servidor!");
    }
  }

  async function limparFormulario() {
    // ── 4. Reset manual: também limpa o Redis ────────────────────────────
    try { await api.delete(`/api/cache/${CACHE_KEY}`); } catch { /* silencioso */ }
    setNome("");
    setEmail("");
    setSenha("");
    setCSenha("");
    setCargo("");
    setErros({});
    setStep(1);
  }

  const step1Valido =
    nome.trim().length > 2 &&
    emailValido(email) &&
    SENHA_FORTE_REGEX.test(senha) &&
    senha === csenha &&
    cargo.trim().length > 0;

  return (
    <div className="cadastro-box">
      <h1 className="title">
        <img src={logo} className="logo-img" alt="Logo" /> CR Metais
      </h1>
      <p className="subtitle">Cadastro de novo colaborador</p>

      {step === 1 ? (
        <>
          <div className="input-box">
            <img src={info} className="icon-img" alt="info" />
            <input
              placeholder="Informe seu nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          </div>
          {erros.nome && <span className="erro">{erros.nome}</span>}

          <div className="input-box">
            <img src={info} className="icon-img" alt="info" />
            <input
              placeholder="Informe seu email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          {erros.email && <span className="erro">{erros.email}</span>}

          <div className="input-box">
            <img src={info} className="icon-img" alt="info" />
            <input
              type="password"
              placeholder="Informe sua senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
          </div>
          {erros.senha && <span className="erro">{erros.senha}</span>}

          <div className="input-box">
            <img src={info} className="icon-img" alt="info" />
            <input
              type="password"
              placeholder="Confirme sua senha"
              value={csenha}
              onChange={(e) => setCSenha(e.target.value)}
            />
          </div>
          {erros.csenha && <span className="erro">{erros.csenha}</span>}

          <div className="input-box">
            <img src={info} className="icon-img" alt="info" />
            <select
              value={cargo}
              onChange={(e) => setCargo(e.target.value)}
              className="select-cargo"
            >
              <option value="" disabled hidden>Selecione um cargo</option>
              <option value="ADMIN">ADMIN</option>
              <option value="COMUM">COMUM</option>
            </select>
          </div>
          {erros.cargo && <span className="erro">{erros.cargo}</span>}

          <div className="btn-wrapper">
            <button className="btn-prev" onClick={enviarCadastro} disabled={!step1Valido}>
              Próximo
            </button>
          </div>
        </>
      ) : (
        <div className="final-step">
          <h2 className="final-title">Cadastro realizado com sucesso!</h2>
          <img src={check} alt="Sucesso" className="final-check" />
          <div className="btn-wrapper">
            <button className="btn-prev" onClick={limparFormulario}>
              Finalizado
            </button>
          </div>
        </div>
      )}
    </div>
  );
}