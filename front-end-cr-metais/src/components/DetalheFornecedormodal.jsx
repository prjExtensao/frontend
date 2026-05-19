import React, { useEffect, useState } from "react";
import { API_URL } from "../services/apiClient";
import { 
  FaTimes, FaBuilding, FaUser, FaPhone, FaMapMarkerAlt, 
  FaTag, FaIdCard, FaRegFileAlt, FaUniversity, FaCreditCard, FaCheckCircle, FaTimesCircle 
} from "react-icons/fa";
import styles from "../styles/DetalheFornecedor.module.css";
 
export default function DetalheFornecedorModal({ isOpen, isClosing, onClose, fornecedorId }) {
  const [fornecedor, setFornecedor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState(null);
 
  useEffect(() => {
    if (!isOpen || !fornecedorId) return;
 
    setLoading(true);
    setErro(null);
    setFornecedor(null);
 
    const token = localStorage.getItem("token");
    fetch(`${API_URL}/fornecedores/${fornecedorId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Erro ao buscar fornecedor");
        return res.json();
      })
      .then((data) => {
        setFornecedor(data);
        setLoading(false);
      })
      .catch((err) => {
        setErro(err.message);
        setLoading(false);
      });
  }, [isOpen, fornecedorId]);
 
  if (!isOpen) return null;
 
  // Tratamento para o campo "Pertence ao fornecedor" (Sim ou Não)
  const pertenceAoFornecedorTexto = (val) => {
    if (val === true || val === "sim" || val === "SIM" || val === "S") return "Sim";
    if (val === false || val === "nao" || val === "não" || val === "NAO" || val === "N") return "Não";
    return null;
  };
 
  return (
    <div className={`${styles.overlay} ${isClosing ? styles.overlayOut : styles.overlayIn}`}>
      <div className={`${styles.modal} ${isClosing ? styles.modalOut : styles.modalIn}`}>
 
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.iconBadge}>
              <FaBuilding />
            </div>
            <div>
              <p className={styles.headerLabel}>Detalhes do Fornecedor</p>
              <h2 className={styles.headerTitle}>
                {loading ? "Carregando..." : fornecedor?.nome || "—"}
              </h2>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Fechar">
            <FaTimes />
          </button>
        </div>
 
        {/* Body */}
        <div className={styles.body}>
          {loading && (
            <div className={styles.loadingWrapper}>
              <div className={styles.spinner} />
              <span>Buscando informações...</span>
            </div>
          )}
 
          {erro && (
            <div className={styles.erroBox}>
              <span>⚠ {erro}</span>
            </div>
          )}
 
          {!loading && !erro && fornecedor && (
            <div className={styles.modalContentWrapper}>
              {/* ID Badge */}
              <div className={styles.idBadge}>
                <FaIdCard className={styles.idIcon} />
                <span>ID #{fornecedor.idFornecedor || fornecedor.id}</span>
              </div>
 
              {/* SEÇÃO 1: DADOS GERAIS */}
              <h3 className={styles.sectionTitle}>Dados Gerais</h3>
              <div className={styles.grid}>
                <InfoCard
                  icon={<FaBuilding />}
                  label="Nome Completo / Razão Social"
                  value={fornecedor.nome}
                  highlight
                />
                <InfoCard
                  icon={<FaRegFileAlt />}
                  label="Apelido / Nome Fantasia"
                  value={fornecedor.apelido}
                />
                <InfoCard
                  icon={<FaIdCard />}
                  label="Tipo de Pessoa"
                  value={fornecedor.tipoFornecedor || fornecedor.tipo}
                />
                <InfoCard
                  icon={<FaIdCard />}
                  label="CPF ou CNPJ"
                  value={fornecedor.documento}
                />
                <InfoCard
                  icon={<FaPhone />}
                  label="Telefone para Contato"
                  value={fornecedor.telefone}
                />
                <InfoCard
                  icon={<FaUser />}
                  label="Responsável"
                  value={
                    typeof fornecedor.responsavel === "object" && fornecedor.responsavel !== null
                      ? fornecedor.responsavel.nome
                      : fornecedor.responsavel
                  }
                />
                <InfoCard
                  icon={<FaTag />}
                  label="Tabela de Preço"
                  value={
                    typeof fornecedor.tabelaPreco === "object" && fornecedor.tabelaPreco !== null
                      ? fornecedor.tabelaPreco.nomeTabela
                      : fornecedor.tabelaPreco
                  }
                />
              </div>
 
              {/* SEÇÃO 2: ENDEREÇO */}
              <h3 className={styles.sectionTitle}>Endereço</h3>
              <div className={styles.grid}>
                <InfoCard
                  icon={<FaMapMarkerAlt />}
                  label="CEP"
                  value={fornecedor.endereco?.cep}
                />
                <InfoCard
                  icon={<FaMapMarkerAlt />}
                  label="Logradouro (Rua/Av)"
                  value={fornecedor.endereco?.logradouro}
                />
                <InfoCard
                  icon={<FaMapMarkerAlt />}
                  label="Número"
                  value={fornecedor.endereco?.numero}
                />
                <InfoCard
                  icon={<FaMapMarkerAlt />}
                  label="Bairro"
                  value={fornecedor.endereco?.bairro}
                />
                <InfoCard
                  icon={<FaMapMarkerAlt />}
                  label="Município / Cidade"
                  value={fornecedor.endereco?.cidade}
                />
                <InfoCard
                  icon={<FaMapMarkerAlt />}
                  label="UF / Estado"
                  value={fornecedor.endereco?.estado}
                />
                <InfoCard
                  icon={<FaMapMarkerAlt />}
                  label="Complemento"
                  value={fornecedor.endereco?.complemento}
                />
              </div>
 
             {/* SEÇÃO 3: FINANCEIRO E PAGAMENTO*/}
              {/*<h3 className={styles.sectionTitle}>Informações Financeiras & Pagamento</h3>*/}
              <div className={styles.grid}>
                <InfoCard
                  icon={<FaCreditCard />}
                  label="Tipo de Pagamento"
                  value={fornecedor.tipoPagamento} 
                />
                
                <InfoCard
                  icon={
                    fornecedor.pertenceAoFornecedor === true || String(fornecedor.pertenceAoFornecedor).toLowerCase() === "sim"
                      ? <FaCheckCircle style={{ color: "#2f855a" }} /> 
                      : <FaTimesCircle style={{ color: "#c53030" }} />
                  }
                  label="A conta pertence ao fornecedor?"
                  value={pertenceAoFornecedorTexto(fornecedor.pertenceAoFornecedor)}
                />

                <InfoCard
                  icon={<FaUniversity />}
                  label="Chave Pix ou Banco"
                  value={fornecedor.chavePix || fornecedor.banco}
                />

                <InfoCard
                  icon={<FaUniversity />}
                  label="Agência"
                  value={fornecedor.agencia}
                />

                <InfoCard
                  icon={<FaUniversity />}
                  label="Número da Conta"
                  value={fornecedor.numeroConta}
                />

                <InfoCard
                  icon={<FaRegFileAlt />}
                  label="Tipo de Conta"
                  value={fornecedor.tipoConta}
                />
                
                {/* Dados do Titular (Caso não pertença ao fornecedor) */}
                <InfoCard
                  icon={<FaUser />}
                  label="Nome do Titular da Conta"
                  value={fornecedor.nomeTitular}
                />

                <InfoCard
                  icon={<FaIdCard />}
                  label="CPF/CNPJ do Titular"
                  value={fornecedor.cpfCnpjTitular}
                />
              </div>
            </div>
          )}
        </div>
 
        {/* Footer */}
        <div className={styles.footer}>
          <button className={styles.btnFechar} onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
 
function InfoCard({ icon, label, value, highlight, wide }) {
  if (value === null || value === undefined || value === "") return null; 
  
  return (
    <div className={`${styles.infoCard} ${highlight ? styles.infoCardHighlight : ""} ${wide ? styles.infoCardWide : ""}`}>
      <div className={styles.infoIcon}>{icon}</div>
      <div className={styles.infoContent}>
        <span className={styles.infoLabel}>{label}</span>
        <span className={styles.infoValue}>{value}</span>
      </div>
    </div>
  );
}