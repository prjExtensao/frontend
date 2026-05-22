import React, { useState, useEffect } from "react";
import { buscarClientePorId, atualizarCliente } from "../services/clienteService";
import CustomSelect from "./BoxSelects";
import { API_URL } from "../services/apiClient";
import styles from "../styles/Clientes.module.css";

const TOTAL_STEPS = 3;

export default function EditarClienteModal({ isOpen, isClosing, onClose, clienteId, onSuccess }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [cepErro, setCepErro] = useState("");
  const [tabelasDisponiveis, setTabelasDisponiveis] = useState([]);

  const [idEndereco, setIdEndereco] = useState(null);

  const [dadosPessoais, setDadosPessoais] = useState({
    cnpj: "", razaoSocial: "", telContato: "",
  });

  const [endereco, setEndereco] = useState({
    cep: "", bairro: "", logradouro: "", numero: "",
    municipio: "", uf: "", complemento: "",
  });

  const [tabela, setTabela] = useState({
    idTabela: null, nomeTabela: "",
  });

  // ─── Carrega dados ao abrir ───
  useEffect(() => {
    if (!isOpen || !clienteId) return;

    setLoading(true);
    setStep(1);

    Promise.all([
      fetch(`${API_URL}/tabelas-precos`).then((r) => r.json()),
      fetch(`${API_URL}/clientes/${clienteId}`).then((r) => r.json()),
    ])
      .then(([tabelasData, cliente]) => {
        setTabelasDisponiveis(Array.isArray(tabelasData) ? tabelasData.filter((t) => t.ativa) : []);

        setDadosPessoais({
          cnpj: cliente.cnpj ?? "",
          razaoSocial: cliente.razaoSocial ?? "",
          telContato: cliente.telContato ?? "",
        });

        const end = cliente.endereco ?? {};
        setIdEndereco(end.idEndereco ?? null);
        setEndereco({
          cep: end.cep ?? "",
          bairro: end.bairro ?? "",
          logradouro: end.logradouro ?? "",
          numero: end.numero ?? "",
          municipio: end.cidade ?? "",
          uf: end.estado ?? "",
          complemento: end.complemento ?? "",
        });

        const tp = cliente.tabelaPreco;
        if (tp) {
          setTabela({ idTabela: tp.idTabela, nomeTabela: tp.nomeTabela });
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [isOpen, clienteId]);

  if (!isOpen) return null;

  // ─── Busca CEP ───
  const buscarCep = async (cep) => {
    const cepLimpo = cep.replace(/\D/g, "");
    if (cepLimpo.length !== 8) return;
    setCepLoading(true);
    setCepErro("");
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await res.json();
      if (data.erro) { setCepErro("CEP não encontrado."); return; }
      setEndereco((prev) => ({
        ...prev,
        bairro: data.bairro || "",
        logradouro: data.logradouro || "",
        municipio: data.localidade || "",
        uf: data.uf || "",
      }));
    } catch {
      setCepErro("Erro ao buscar CEP.");
    } finally {
      setCepLoading(false);
    }
  };

  // ─── Navegação ───
  const handleNext = () => {
    if (step === 1) {
      if (!dadosPessoais.razaoSocial || !dadosPessoais.cnpj || !dadosPessoais.telContato) {
        alert("Preencha todos os campos obrigatórios antes de continuar.");
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

  // ─── Salvar ───
  const handleFinish = async () => {
    try {
      // 1. Atualiza endereço
      const enderecoPayload = {
        estado: endereco.uf,
        cidade: endereco.municipio,
        cep: endereco.cep.replace(/\D/g, ""),
        logradouro: endereco.logradouro,
        complemento: endereco.complemento || null,
        bairro: endereco.bairro,
        numero: endereco.numero,
      };

      const resEndereco = await fetch(`${API_URL}/enderecos/${idEndereco}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(enderecoPayload),
      });
      if (!resEndereco.ok) throw new Error("Erro ao atualizar endereço");

      // 2. Atualiza cliente (cnpj, razaoSocial, telContato + ids de referência)
      const clientePayload = {
        cnpj: dadosPessoais.cnpj.replace(/\D/g, ""),
        razaoSocial: dadosPessoais.razaoSocial,
        telContato: dadosPessoais.telContato.replace(/\D/g, ""),
        idEndereco: idEndereco,
        idTabelaPreco: tabela.idTabela,
      };
      console.log("📦 Cliente payload:", clientePayload);

      const resCliente = await fetch(`${API_URL}/clientes/${clienteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clientePayload),
      });
      if (!resCliente.ok) throw new Error("Erro ao atualizar cliente");

      onClose();
      onSuccess?.();
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className={styles.modalOverlay}>
        <div className={`${styles.modal} ${isClosing ? styles.closing : ""}`}>
          <p style={{ textAlign: "center", padding: "2rem" }}>Carregando dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.modalOverlay}>
      <div className={`${styles.modal} ${isClosing ? styles.closing : ""}`}>

        {/* ETAPA 1 — Dados do cliente */}
        {step === 1 && (
          <>
            <h2 className={styles.modalTitle}>✏️ Editar cliente ✏️</h2>

            <div className={styles.campos}>
              <span>Razão Social</span>
              <input className={styles.inputs} type="text"
                value={dadosPessoais.razaoSocial}
                onChange={(e) => setDadosPessoais({ ...dadosPessoais, razaoSocial: e.target.value })} />
            </div>
            <div className={styles.campos}>
              <span>CNPJ</span>
              <input className={styles.inputs} type="text"
                value={dadosPessoais.cnpj}
                onChange={(e) => setDadosPessoais({ ...dadosPessoais, cnpj: e.target.value })} />
            </div>
            <div className={styles.campos}>
              <span>Telefone de Contato</span>
              <input className={styles.inputs} type="text"
                value={dadosPessoais.telContato}
                onChange={(e) => setDadosPessoais({ ...dadosPessoais, telContato: e.target.value })} />
            </div>

            <button className={styles.btn_proxima_pagina} onClick={handleNext}>Próxima página</button>
            <button className={styles.btn_fechar} onClick={onClose}>Fechar</button>
          </>
        )}

        {/* ETAPA 2 — Endereço */}
        {step === 2 && (
          <>
            <h2 className={styles.modalTitle}>✏️ Editar cliente ✏️</h2>

            <div className={styles.campos}>
              <span>CEP</span>
              <input className={styles.inputs} type="text" value={endereco.cep}
                onChange={(e) => { setEndereco({ ...endereco, cep: e.target.value }); setCepErro(""); }}
                onBlur={(e) => buscarCep(e.target.value)} />
              {cepLoading && <span style={{ fontSize: "0.8rem", color: "#888" }}>Buscando CEP...</span>}
              {cepErro && <span style={{ fontSize: "0.8rem", color: "red" }}>{cepErro}</span>}
            </div>
            <div className={styles.campos}>
              <span>Bairro</span>
              <input className={styles.inputs} type="text" value={endereco.bairro}
                onChange={(e) => setEndereco({ ...endereco, bairro: e.target.value })} />
            </div>
            <div className={styles.campos}>
              <span>Logradouro</span>
              <input className={styles.inputs} type="text" value={endereco.logradouro}
                onChange={(e) => setEndereco({ ...endereco, logradouro: e.target.value })} />
            </div>
            <div className={styles.campos}>
              <span>Número</span>
              <input className={styles.inputs} type="text" value={endereco.numero}
                onChange={(e) => setEndereco({ ...endereco, numero: e.target.value })} />
            </div>
            <div className={styles.campos}>
              <span>Complemento</span>
              <input className={styles.inputs} type="text" value={endereco.complemento}
                onChange={(e) => setEndereco({ ...endereco, complemento: e.target.value })} />
            </div>
            <div className={styles.campos}>
              <span>Município</span>
              <input className={styles.inputs} type="text" value={endereco.municipio}
                onChange={(e) => setEndereco({ ...endereco, municipio: e.target.value })} />
            </div>
            <div className={styles.campos}>
              <span>UF</span>
              <input className={styles.inputs} type="text" maxLength={2} value={endereco.uf}
                onChange={(e) => setEndereco({ ...endereco, uf: e.target.value.toUpperCase() })} />
            </div>

            <div className={styles.btns_back_prox}>
              <button className={styles.btn_fechar} onClick={handleBack}>Voltar</button>
              <button className={styles.btn_proxima_pagina} onClick={handleNext}>Próx. página</button>
            </div>
            <button className={styles.btn_fechar} onClick={onClose}>Fechar</button>
          </>
        )}

        {/* ETAPA 3 — Tabela de preço */}
        {step === 3 && (
          <>
            <h2 className={styles.modalTitle}>✏️ Editar cliente ✏️</h2>

            <div className={styles.campos}>
              <span>Tabela de preço</span>
              <CustomSelect
                placeholder="Selecione a tabela"
                options={tabelasDisponiveis.filter((t) => t.ativa).map((t) => t.nomeTabela)}
                value={tabela.nomeTabela}
                onChange={(nomeTabela) => {
                  const selecionada = tabelasDisponiveis.find((t) => t.nomeTabela === nomeTabela);
                  setTabela({ nomeTabela, idTabela: selecionada?.idTabela ?? null });
                }}
              />
            </div>

            <div className={styles.btns_back_prox}>
              <button className={styles.btn_fechar} onClick={handleBack}>Voltar</button>
              <button className={styles.btn_proxima_pagina} onClick={handleFinish}>Salvar</button>
            </div>
            <button className={styles.btn_fechar} onClick={onClose}>Fechar</button>
          </>
        )}

      </div>
    </div>
  );
}