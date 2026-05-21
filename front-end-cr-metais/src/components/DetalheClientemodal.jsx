import React, { useEffect, useState } from "react";
import { buscarClientePorId } from "../services/clienteService"; 
import { FaTimes, FaUser, FaPhone, FaIdCard } from "react-icons/fa";
import styles from "../styles/DetalheFornecedor.module.css"; 

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
        setErro(err.message || "Erro ao buscar informações do cliente");
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
              <FaUser />
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
                  icon={<FaUser />}
                  label="Razão Social / Nome"
                  value={cliente.razaoSocial} // Vai renderizar "Vital"
                  highlight
                />
                <InfoCard
                  icon={<FaIdCard />}
                  label="CNPJ"
                  value={cliente.cnpj} // Vai renderizar "43758362000100"
                />
                <InfoCard
                  icon={<FaPhone />}
                  label="Telefone para Contato"
                  value={cliente.telContato} // Vai renderizar "11977773333"
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