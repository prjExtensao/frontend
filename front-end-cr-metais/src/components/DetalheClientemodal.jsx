import React, { useEffect, useState } from "react";
import { 
  FaTimes, FaBuilding, FaPhone, FaMapMarkerAlt, 
  FaTag, FaIdCard, FaRegFileAlt 
} from "react-icons/fa";
import styles from "../styles/DetalheFornecedor.module.css"; // Utilizando o mesmo CSS para manter a identidade visual
import { buscarClientePorId } from "../services/clienteService";

export default function DetalheClienteModal({ isOpen, isClosing, onClose, clienteId }) {
  const [cliente, setCliente] = useState(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    if (!isOpen || !clienteId) return;

    setLoading(true);
    setErro(null);
    setCliente(null);

    buscarClientePorId(clienteId)
      .then((data) => {
        setCliente(data);
        setLoading(false);
      })
      .catch((err) => {
        setErro(err.message || "Erro ao buscar dados do cliente");
        setLoading(false);
      });
  }, [isOpen, clienteId]);

  if (!isOpen) return null;

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
              <p className={styles.headerLabel}>Detalhes do Cliente</p>
              <h2 className={styles.headerTitle}>
                {loading ? "Carregando..." : cliente?.razaoSocial || "—"}
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

          {!loading && !erro && cliente && (
            <div className={styles.modalContentWrapper}>
              
              {/* ID Badge */}
              <div className={styles.idBadge}>
                <FaIdCard className={styles.idIcon} />
                <span>ID #{cliente.idCliente}</span>
              </div>

              {/* SEÇÃO 1: DADOS GERAIS */}
              <h3 className={styles.sectionTitle}>Dados Gerais</h3>
              <div className={styles.grid}>
                <InfoCard
                  icon={<FaBuilding />}
                  label="Razão Social"
                  value={cliente.razaoSocial}
                  highlight
                />
                <InfoCard
                  icon={<FaIdCard />}
                  label="CNPJ do Cliente"
                  value={cliente.cnpj}
                />
                <InfoCard
                  icon={<FaPhone />}
                  label="Telefone de Contato"
                  value={cliente.telContato}
                />
              </div>

              {/* SEÇÃO 2: TABELA DE PREÇO */}
              <h3 className={styles.sectionTitle}>Tabela Comercial</h3>
              <div className={styles.grid}>
                <InfoCard
                  icon={<FaTag />}
                  label="Nome da Tabela"
                  value={cliente.tabelaPreco?.nomeTabela}
                />
                <InfoCard
                  icon={<FaRegFileAlt />}
                  label="Tipo / Regime"
                  value={cliente.tabelaPreco?.tipo}
                />
                <InfoCard
                  icon={<FaRegFileAlt />}
                  label="Versão Ativa"
                  value={cliente.tabelaPreco?.versao ? `v${cliente.tabelaPreco.versao}` : null}
                />
              </div>

              {/* SEÇÃO 3: ENDEREÇO */}
              <h3 className={styles.sectionTitle}>Endereço Logístico</h3>
              {cliente.endereco ? (
                <div className={styles.grid}>
                  <InfoCard
                    icon={<FaMapMarkerAlt />}
                    label="CEP"
                    value={cliente.endereco.cep}
                  />
                  <InfoCard
                    icon={<FaMapMarkerAlt />}
                    label="Logradouro (Rua/Av)"
                    value={cliente.endereco.logradouro}
                  />
                  <InfoCard
                    icon={<FaMapMarkerAlt />}
                    label="Número"
                    value={cliente.endereco.numero}
                  />
                  <InfoCard
                    icon={<FaMapMarkerAlt />}
                    label="Bairro"
                    value={cliente.endereco.bairro}
                  />
                  <InfoCard
                    icon={<FaMapMarkerAlt />}
                    label="Município / Cidade"
                    value={cliente.endereco.cidade}
                  />
                  <InfoCard
                    icon={<FaMapMarkerAlt />}
                    label="UF / Estado"
                    value={cliente.endereco.estado}
                  />
                  <InfoCard
                    icon={<FaMapMarkerAlt />}
                    label="Complemento"
                    value={cliente.endereco.complemento}
                  />
                </div>
              ) : (
                <div style={{ padding: "10px", color: "#9ca3af", fontStyle: "italic" }}>
                  Nenhum endereço vinculado a este cliente.
                </div>
              )}

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

// Componente Interno InfoCard preservando o comportamento original
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