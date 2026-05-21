import React, { useState, useEffect } from "react";
import { API_URL } from "../services/apiClient";
import styles from "../styles/Clientes.module.css";
import CustomSelect from "./BoxSelects";

const TOTAL_STEPS = 3;

export default function NovoClienteModal({ isOpen, isClosing, onClose, onSuccess }) {
  const [step, setStep] = useState(1);
  const [cepLoading, setCepLoading] = useState(false);
  const [cepErro, setCepErro] = useState("");
  const [tabelasDisponiveis, setTabelasDisponiveis] = useState([]);

  const [dadosPessoais, setDadosPessoais] = useState({
    cnpj: "",
    razaoSocial: "",
    telContato: "",
  });

  const [endereco, setEndereco] = useState({
    cep: "",
    bairro: "",
    logradouro: "",
    numero: "",
    municipio: "",
    uf: "",
    complemento: "",
  });

  const [tabela, setTabela] = useState({
    idTabela: null,
    nomeTabela: "",
  });

  const resetarEstados = () => {
    setStep(1);
    setCepErro("");
    setDadosPessoais({ cnpj: "", razaoSocial: "", telContato: "" });
    setEndereco({ cep: "", bairro: "", logradouro: "", numero: "", municipio: "", uf: "", complemento: "" });
    setTabela({ idTabela: null, nomeTabela: "" });
  };

  useEffect(() => {
    if (!isOpen) return;

    fetch(`${API_URL}/tabelas-precos`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error("Erro ao buscar tabelas");
        return r.json();
      })
      .then((data) => {
        const tabelas = Array.isArray(data) ? data : [];
        // Mantém apenas a versão mais recente de cada tabela
        const maisRecentes = Object.values(
          tabelas.reduce((acc, t) => {
            const nome = t.nomeTabela;
            if (!acc[nome] || t.versao > acc[nome].versao) acc[nome] = t;
            return acc;
          }, {})
        );
        setTabelasDisponiveis(maisRecentes);
      })
      .catch((err) => {
        console.error(err);
        alert("Erro ao carregar tabelas de preço");
      });
  }, [isOpen]);

  if (!isOpen) return null;

  const buscarCep = async (cep) => {
    const cepLimpo = cep.replace(/\D/g, "");
    if (cepLimpo.length !== 8) return;

    setCepLoading(true);
    setCepErro("");

    try {
      const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await res.json();

      if (data.erro) {
        setCepErro("CEP não encontrado. Verifique e tente novamente.");
        return;
      }

      setEndereco((prev) => ({
        ...prev,
        bairro: data.bairro || "",
        logradouro: data.logradouro || "",
        municipio: data.localidade || "",
        uf: data.uf || "",
      }));
    } catch {
      setCepErro("Erro ao buscar CEP. Verifique sua conexão.");
    } finally {
      setCepLoading(false);
    }
  };

  const handleNext = () => {
    if (step === 1) {
      const cnpjLimpo = dadosPessoais.cnpj.replace(/\D/g, "");
      const telLimpo = dadosPessoais.telContato.replace(/\D/g, "");

      if (cnpjLimpo.length < 14) {
        alert("Informe um CNPJ válido (14 dígitos).");
        return;
      }
      if (!dadosPessoais.razaoSocial.trim()) {
        alert("Razão social é obrigatória.");
        return;
      }
      if (telLimpo.length < 10) {
        alert("Telefone deve ter ao menos 10 dígitos.");
        return;
      }
    }

    if (step === 2) {
      if (!endereco.cep || !endereco.bairro || !endereco.logradouro || !endereco.numero || !endereco.municipio || !endereco.uf) {
        alert("Preencha todos os campos de endereço, incluindo o número.");
        return;
      }
    }

    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  };

  const handleBack = () => setStep((s) => Math.max(s - 1, 1));

  const handleFinish = async () => {
    if (!tabela.idTabela) {
      alert("Selecione uma tabela de preço.");
      return;
    }

    try {
      // 1. Salva o endereço
      const enderecoPayload = {
        estado: endereco.uf,
        cidade: endereco.municipio,
        cep: endereco.cep.replace(/\D/g, ""),
        logradouro: endereco.logradouro,
        complemento: endereco.complemento || null,
        bairro: endereco.bairro,
        numero: endereco.numero,
      };

      const resEndereco = await fetch(`${API_URL}/enderecos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(enderecoPayload),
      });

      if (!resEndereco.ok) {
        const erro = await resEndereco.text();
        console.error("Erro endereço:", erro);
        throw new Error("Erro ao salvar endereço");
      }

      const enderecoSalvo = await resEndereco.json();

      // 2. Salva o cliente
      const clientePayload = {
        cnpj: dadosPessoais.cnpj.replace(/\D/g, ""),
        razaoSocial: dadosPessoais.razaoSocial,
        telContato: dadosPessoais.telContato.replace(/\D/g, ""),
        idEndereco: enderecoSalvo.idEndereco,
        idTabelaPreco: tabela.idTabela,
      };

      const resCliente = await fetch(`${API_URL}/clientes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(clientePayload),
      });

      if (!resCliente.ok) {
        const erro = await resCliente.text();
        console.error("Erro cliente:", erro);
        throw new Error("Erro ao salvar cliente");
      }

      resetarEstados();
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };

  const handleClose = () => {
    resetarEstados();
    onClose();
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={`${styles.modal} ${isClosing ? styles.closing : ""}`}>

        {/* ───────────── ETAPA 1 — Dados do Cliente ───────────── */}
        {step === 1 && (
          <>
            <h2 className={styles.modalTitle}>✏️ Novo cliente ✏️</h2>

            <div className={styles.campos}>
              <span>CNPJ</span>
              <input
                className={styles.inputs}
                type="text"
                placeholder="00.000.000/0000-00"
                value={dadosPessoais.cnpj}
                onChange={(e) => setDadosPessoais({ ...dadosPessoais, cnpj: e.target.value })}
              />
            </div>

            <div className={styles.campos}>
              <span>Razão Social</span>
              <input
                className={styles.inputs}
                type="text"
                placeholder="Nome da empresa"
                value={dadosPessoais.razaoSocial}
                onChange={(e) => setDadosPessoais({ ...dadosPessoais, razaoSocial: e.target.value })}
              />
            </div>

            <div className={styles.campos}>
              <span>Telefone para contato</span>
              <input
                className={styles.inputs}
                type="text"
                placeholder="(11) 99999-9999"
                value={dadosPessoais.telContato}
                onChange={(e) => setDadosPessoais({ ...dadosPessoais, telContato: e.target.value })}
              />
            </div>

            <button className={styles.btn_proxima_pagina} onClick={handleNext}>
              Próxima página
            </button>
            <button className={styles.btn_fechar} onClick={handleClose}>
              Fechar
            </button>
          </>
        )}

        {/* ───────────── ETAPA 2 — Endereço ───────────── */}
        {step === 2 && (
          <>
            <h2 className={styles.modalTitle}>✏️ Novo cliente ✏️</h2>

            <div className={styles.campos}>
              <span>CEP</span>
              <input
                className={styles.inputs}
                type="text"
                placeholder="00000-000"
                value={endereco.cep}
                onChange={(e) => {
                  setEndereco({ ...endereco, cep: e.target.value });
                  setCepErro("");
                }}
                onBlur={(e) => buscarCep(e.target.value)}
              />
              {cepLoading && (
                <span style={{ fontSize: "0.8rem", color: "#888" }}>Buscando CEP...</span>
              )}
              {cepErro && (
                <span style={{ fontSize: "0.8rem", color: "red" }}>{cepErro}</span>
              )}
            </div>

            <div className={styles.campos}>
              <span>Bairro</span>
              <input
                className={styles.inputs}
                type="text"
                placeholder="Centro"
                value={endereco.bairro}
                onChange={(e) => setEndereco({ ...endereco, bairro: e.target.value })}
              />
            </div>

            <div className={styles.campos}>
              <span>Logradouro</span>
              <input
                className={styles.inputs}
                type="text"
                placeholder="Rua das Flores"
                value={endereco.logradouro}
                onChange={(e) => setEndereco({ ...endereco, logradouro: e.target.value })}
              />
            </div>

            <div className={styles.campos}>
              <span>Número</span>
              <input
                className={styles.inputs}
                type="text"
                placeholder="123"
                value={endereco.numero}
                onChange={(e) => setEndereco({ ...endereco, numero: e.target.value })}
              />
            </div>

            <div className={styles.campos}>
              <span>Complemento <span style={{ fontSize: "0.75rem", color: "#888" }}>(opcional)</span></span>
              <input
                className={styles.inputs}
                type="text"
                placeholder="Apto 12, Bloco B..."
                value={endereco.complemento}
                onChange={(e) => setEndereco({ ...endereco, complemento: e.target.value })}
              />
            </div>

            <div className={styles.campos}>
              <span>Município</span>
              <input
                className={styles.inputs}
                type="text"
                placeholder="São Paulo"
                value={endereco.municipio}
                onChange={(e) => setEndereco({ ...endereco, municipio: e.target.value })}
              />
            </div>

            <div className={styles.campos}>
              <span>UF</span>
              <input
                className={styles.inputs}
                type="text"
                placeholder="SP"
                maxLength={2}
                value={endereco.uf}
                onChange={(e) => setEndereco({ ...endereco, uf: e.target.value.toUpperCase() })}
              />
            </div>

            <div className={styles.btns_back_prox}>
              <button className={styles.btn_fechar} onClick={handleBack}>
                Voltar
              </button>
              <button className={styles.btn_proxima_pagina} onClick={handleNext}>
                Próx. página
              </button>
            </div>

            <button className={styles.btn_fechar} onClick={handleClose}>
              Fechar
            </button>
          </>
        )}

        {/* ───────────── ETAPA 3 — Tabela de Preço ───────────── */}
        {step === 3 && (
          <>
            <h2 className={styles.modalTitle}>✏️ Novo cliente ✏️</h2>

            <div className={styles.campos}>
              <span>Tabela de preço</span>
              <CustomSelect
                placeholder="Selecione a tabela"
                options={tabelasDisponiveis.map((t) => t.nomeTabela)}
                value={tabela.nomeTabela}
                onChange={(nomeTabela) => {
                  const selecionada = tabelasDisponiveis.find((t) => t.nomeTabela === nomeTabela);
                  setTabela({ nomeTabela, idTabela: selecionada?.idTabela ?? null });
                }}
              />
            </div>

            <div className={styles.btns_back_prox}>
              <button className={styles.btn_fechar} onClick={handleBack}>
                Voltar
              </button>
              <button className={styles.btn_proxima_pagina} onClick={handleFinish}>
                Finalizar
              </button>
            </div>

            <button className={styles.btn_fechar} onClick={handleClose}>
              Fechar
            </button>
          </>
        )}

      </div>
    </div>
  );
}