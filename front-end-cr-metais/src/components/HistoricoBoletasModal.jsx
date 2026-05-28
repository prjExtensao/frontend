import React, { useEffect, useState } from "react";
import { FaTimes } from "react-icons/fa";
import "../styles/HistoricoBoletasModal.css";

const STORAGE_KEY = "boletas_confirmadas";
const VINTE_QUATRO_HORAS = 24 * 60 * 60 * 1000;

const formatarMoeda = (valor) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor || 0);

const formatarHora = (iso) => {
  const d = new Date(iso);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
};

/** Salva uma boleta confirmada no localStorage */
export const salvarBoletaConfirmada = (boleta, nomeEntidade, produtos) => {
  try {
    const existentes = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

    const itensComNome = (boleta.itensBoleta || [])
      .filter(i => i.produtoId && Number(i.peso) > 0)
      .map(i => {
        const prod = produtos.find(p => String(p.id ?? p.idProduto) === String(i.produtoId));
        return {
          produto: prod ? (prod.nome ?? prod.descricao) : `Produto #${i.produtoId}`,
          peso: Number(i.peso),
          valorUnitario: Number(i.valorUnitario),
          total: Number(i.total),
          bags: Number(i.bags || 0),
        };
      });

    const registro = {
      id: Date.now(),
      confirmedAt: new Date().toISOString(),
      nomeEntidade,
      tipoNota: boleta.tipoNota || "SAÍDA",
      classeNota: boleta.classeNota || "RETIRADA",
      itens: itensComNome,
      totalGeral: itensComNome.reduce((s, i) => s + i.total, 0),
      pesoTotal: itensComNome.reduce((s, i) => s + i.peso, 0),
      bagsTotal: itensComNome.reduce((s, i) => s + i.bags, 0),
    };

    existentes.push(registro);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existentes));
  } catch (e) {
    console.error("Erro ao salvar boleta confirmada", e);
  }
};

/** Remove registros com mais de 24h */
const limparExpirados = () => {
  try {
    const agora = Date.now();
    const existentes = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    const validos = existentes.filter(b => agora - new Date(b.confirmedAt).getTime() < VINTE_QUATRO_HORAS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(validos));
    return validos;
  } catch {
    return [];
  }
};

const HistoricoBoletasModal = ({ aberto, onFechar }) => {
  const [boletasConfirmadas, setBoletasConfirmadas] = useState([]);
  const [expandida, setExpandida] = useState(null);

  useEffect(() => {
    if (aberto) {
      setBoletasConfirmadas(limparExpirados());
      setExpandida(null);
    }
  }, [aberto]);

  if (!aberto) return null;

  const totalGeral = boletasConfirmadas.reduce((s, b) => s + b.totalGeral, 0);

  return (
    <div className="hbm_overlay" onClick={onFechar}>
      <div className="hbm_modal" onClick={e => e.stopPropagation()}>
        <div className="hbm_header">
          <h2>Boletas Confirmadas (últimas 24h)</h2>
          <button className="hbm_fechar" onClick={onFechar}><FaTimes /></button>
        </div>

        <div className="hbm_resumo_topo">
          <span>{boletasConfirmadas.length} boleta(s)</span>
          <span>Total: {formatarMoeda(totalGeral)}</span>
        </div>

        <div className="hbm_body">
          {boletasConfirmadas.length === 0 ? (
            <p className="hbm_vazio">Nenhuma boleta confirmada nas últimas 24 horas.</p>
          ) : (
            boletasConfirmadas.map((b) => (
              <div key={b.id} className="hbm_card">
                <div className="hbm_card_header" onClick={() => setExpandida(expandida === b.id ? null : b.id)}>
                  <div className="hbm_card_info">
                    <strong>{b.nomeEntidade}</strong>
                    <span className="hbm_badge">{b.tipoNota}</span>
                    <span className="hbm_badge">{b.classeNota}</span>
                  </div>
                  <div className="hbm_card_valores">
                    <span className="hbm_card_hora">{formatarHora(b.confirmedAt)}</span>
                    <strong className="hbm_card_total">{formatarMoeda(b.totalGeral)}</strong>
                  </div>
                </div>

                {expandida === b.id && (
                  <div className="hbm_card_detalhes">
                    <table className="hbm_tabela">
                      <thead>
                        <tr>
                          <th>Produto</th>
                          <th>Peso (Kg)</th>
                          <th>Valor Un.</th>
                          <th>Total</th>
                          <th>Bags</th>
                        </tr>
                      </thead>
                      <tbody>
                        {b.itens.map((item, idx) => (
                          <tr key={idx}>
                            <td>{item.produto}</td>
                            <td>{item.peso.toFixed(2)}</td>
                            <td>{formatarMoeda(item.valorUnitario)}</td>
                            <td>{formatarMoeda(item.total)}</td>
                            <td>{item.bags}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="hbm_card_rodape">
                      <span>{b.itens.length} produto(s)</span>
                      <span>{b.bagsTotal} bag(s)</span>
                      <span>{b.pesoTotal.toFixed(2)} Kg</span>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default HistoricoBoletasModal;
