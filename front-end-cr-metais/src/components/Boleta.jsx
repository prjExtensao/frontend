import React, { useCallback, useEffect, useState } from "react";
import "../styles/BoletaStyle.css";
import api from "../services/apiClient";
import { FaTrashAlt, FaPlus, FaTimes } from "react-icons/fa";
import Tippy from "@tippyjs/react";
import "tippy.js/dist/tippy.css";
import "tippy.js/themes/light.css";

let contadorBoleta = 1;

const criarBoletaVazia = () => ({
  id: contadorBoleta++,
  itensBoleta: [],
  clienteSelecionadoId: "",
  classeNota: "RETIRADA",
  tipoNota: "SAÍDA",
  pagamentoConfirmado: false,
});

const Boleta = () => {
  const [boletas, setBoletas] = useState([criarBoletaVazia()]);
  const [abaAtiva, setAbaAtiva] = useState(1);

  const [clientes, setClientes] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [precosTabela, setPrecosTabela] = useState([]);
  const [tabelaPorFornecedor, setTabelaPorFornecedor] = useState({});

  const [carregando, setCarregando] = useState(false);
  const [salvandoNota, setSalvandoNota] = useState(false);

  const boletaAtual = boletas.find(b => b.id === abaAtiva) || boletas[0];

  const atualizarBoletaAtual = useCallback((atualizacao) => {
    setBoletas(prev => prev.map(b => {
      if (b.id !== abaAtiva) return b;
      return typeof atualizacao === "function" ? atualizacao(b) : { ...b, ...atualizacao };
    }));
  }, [abaAtiva]);

  const { itensBoleta, clienteSelecionadoId, classeNota, tipoNota, pagamentoConfirmado } = boletaAtual;

  const formatarMoeda = (valor) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor || 0);

  useEffect(() => {
    const buscarDadosIniciais = async () => {
      try {
        const [resProdutos, resPrecos] = await Promise.all([
          api.get("/produtos"),
          api.get("/preco-produto-tabela")
        ]);
        setProdutos(resProdutos.data?.content || resProdutos.data || []);
        setPrecosTabela(resPrecos.data?.content || resPrecos.data || []);
      } catch (error) {
        console.error("Erro ao carregar produtos/preços", error);
      }
    };
    buscarDadosIniciais();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.altKey && event.key.toLowerCase() === "z") {
        event.preventDefault();
        adicionarItem();
      }
      if (event.altKey && event.key.toLowerCase() === "x") {
        event.preventDefault();
        limparBoleta();
      }
      if (event.altKey && event.key.toLowerCase() === "c") {
        event.preventDefault();
        confirmarPagamento();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [abaAtiva, boletas]);

  useEffect(() => {
    const buscarEntidades = async () => {
      setCarregando(true);
      const endpoint = tipoNota === "ENTRADA" ? "fornecedores" : "clientes";

      try {
        const resEntidades = await api.get(`/${endpoint}`);
        setClientes(resEntidades.data?.content || resEntidades.data || []);
      } catch (error) {
        console.error("Erro ao carregar entidades", error);
      }

      if (tipoNota === "ENTRADA") {
        try {
          const resTabelas = await api.get("/tabelas-precos/fornecedores");
          const tabelas = resTabelas.data?.content || resTabelas.data || [];
          const mapaTabelas = {};
          tabelas.forEach(item => {
            const id = item.idFornecedor || item.idCliente || item.id;
            if (id) mapaTabelas[id] = (item.nomeTabela || item.tabela || "").toUpperCase();
          });
          setTabelaPorFornecedor(mapaTabelas);
        } catch (error) {
          setTabelaPorFornecedor({});
        }
      } else {
        setTabelaPorFornecedor({});
      }

      setCarregando(false);
      atualizarBoletaAtual({ clienteSelecionadoId: "", pagamentoConfirmado: false });
    };

    buscarEntidades();
  }, [tipoNota]);

  // -- Gerenciamento de abas --
  const adicionarBoleta = () => {
    const nova = criarBoletaVazia();
    setBoletas(prev => [...prev, nova]);
    setAbaAtiva(nova.id);
  };

  const removerBoleta = (idBoleta) => {
    setBoletas(prev => {
      if (prev.length <= 1) return prev;
      const novas = prev.filter(b => b.id !== idBoleta);
      if (abaAtiva === idBoleta) {
        setAbaAtiva(novas[novas.length - 1].id);
      }
      return novas;
    });
  };

  // -- Ações da boleta ativa --
  const adicionarItem = () => {
    atualizarBoletaAtual(b => ({
      ...b,
      itensBoleta: [...b.itensBoleta, { idLinha: Date.now(), produtoId: "", peso: "", bags: "", valorUnitario: 0, total: 0 }]
    }));
  };

  const atualizarItem = (idLinha, campo, valor) => {
    atualizarBoletaAtual(b => ({
      ...b,
      itensBoleta: b.itensBoleta.map(item => {
        if (item.idLinha !== idLinha) return item;
        const novoItem = { ...item, [campo]: valor };

        if (campo === "produtoId") {
          const precoObj = precosTabela.find(p => String(p.fkProduto || p.produtoId) === String(valor));
          novoItem.valorUnitario = precoObj ? (precoObj.precoProduto || precoObj.preco) : 0;
        }

        novoItem.total = Number(novoItem.peso || 0) * Number(novoItem.valorUnitario || 0);
        return novoItem;
      })
    }));
  };

  const removerItem = (idLinha) => {
    atualizarBoletaAtual(b => ({
      ...b,
      itensBoleta: b.itensBoleta.filter(i => i.idLinha !== idLinha)
    }));
  };

  const limparBoleta = () => {
    atualizarBoletaAtual({ itensBoleta: [] });
  };

  const resumo = itensBoleta.reduce((acc, item) => ({
    total: acc.total + Number(item.total || 0),
    peso: acc.peso + Number(item.peso || 0),
    bags: acc.bags + Number(item.bags || 0),
  }), { total: 0, peso: 0, bags: 0 });

  const confirmarPagamento = async () => {
    const itensValidos = itensBoleta.filter(i => i.produtoId && Number(i.peso) > 0);

    if (!clienteSelecionadoId) return alert("Selecione um cliente/fornecedor.");
    if (itensValidos.length === 0) return alert("Adicione produtos com peso válido.");

    setSalvandoNota(true);
    const dataAtual = new Date().toISOString().slice(0, 10);
    const idEntidade = Number(clienteSelecionadoId);

    try {
      if (tipoNota === "ENTRADA") {
        const itensPayload = itensValidos.map(item => ({
          idProduto: Number(item.produtoId),
          pesoKg: Number(item.peso),
          precoUnitario: Number(item.valorUnitario),
          rendimento: Number(item.total)
        }));

        const resCompra = await api.post("/compra", {
          dataCompra: dataAtual,
          idFornecedor: idEntidade,
          itens: itensPayload
        });

        const idCompra = resCompra.data.idCompra || resCompra.data.id;
        await api.post("/pagamento-compra", {
          dataPagamento: dataAtual,
          idCompra: Number(idCompra),
          idContaPagamento: 1
        });
      } else {
        const resVenda = await api.post("/vendas", {
          idCliente: idEntidade,
          datavenda: dataAtual
        });

        const idVenda = resVenda.data.idVenda || resVenda.data.id;

        for (const item of itensValidos) {
          await api.post("/itens-pedido-venda", {
            fk_venda: Number(idVenda),
            fk_produto: Number(item.produtoId),
            pesoKg: Number(item.peso),
            precoUnitario: Number(item.valorUnitario)
          });
        }
      }

      limparBoleta();
      atualizarBoletaAtual({ pagamentoConfirmado: true });
    } catch (erro) {
      console.error("Detalhe do erro:", erro.response?.data || erro.message);
    } finally {
      setSalvandoNota(false);
    }
  };

  const gerarNotaFiscal = async () => {
    try {
      if (!clienteSelecionadoId) {
        alert("Selecione um cliente/fornecedor.");
        return;
      }

      if (itensBoleta.length === 0) {
        alert("Adicione itens na boleta.");
        return;
      }

      const payload = {
        idFornecedor: Number(clienteSelecionadoId),
        tipoNota,
        classeNota,
        itens: itensBoleta.map(item => ({
          produtoId: Number(item.produtoId),
          peso: Number(item.peso),
          valorUnitario: Number(item.valorUnitario),
          total: Number(item.total),
          bags: Number(item.bags)
        }))
      };

      const resJava = await api.post("/nota-fiscal", payload);

      await fetch("/nf/gerar-nf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(resJava.data)
      });

      console.log("JSON FINAL:", resJava.data);

      alert("NF gerada! Veja o terminal do Python");

    } catch (erro) {
      console.error("Erro ao gerar NF:", erro);
      alert("Erro ao gerar nota fiscal");
    }
  };

  const clienteSelecionado = clientes.find(c => String(c.id || c.idCliente || c.idFornecedor) === clienteSelecionadoId);
  const nomeCliente = clienteSelecionado ? (clienteSelecionado.nome || clienteSelecionado.razaoSocial) : "-";
  const nomeTabela = clienteSelecionado ? (tabelaPorFornecedor[clienteSelecionadoId] || "-") : "-";

  useEffect(() => {
    document.title = "CR Metais | Boleta"
  });

  return (
    <div className="pagina pagina_boleta">
      {/* === BARRA DE ABAS === */}
      <div className="boleta_abas_container">
        <div className="boleta_abas">
          {boletas.map((b, idx) => (
            <div
              key={b.id}
              className={`boleta_aba ${b.id === abaAtiva ? "boleta_aba--ativa" : ""}`}
              onClick={() => setAbaAtiva(b.id)}
            >
              <span className="boleta_aba_titulo">Boleta {idx + 1}</span>
              {boletas.length > 1 && (
                <button
                  className="boleta_aba_fechar"
                  onClick={(e) => { e.stopPropagation(); removerBoleta(b.id); }}
                  title="Excluir boleta"
                >
                  <FaTimes />
                </button>
              )}
            </div>
          ))}
          <button className="boleta_aba_nova" onClick={adicionarBoleta} title="Nova boleta">
            <FaPlus />
          </button>
        </div>
      </div>

      {/* === CONTEÚDO DA BOLETA ATIVA === */}
      <div className="boleta_conteudo_wrapper">
        <div className="conteudo_principal">
          <div className="card_nota">
            <div className="cabecalho_card">
              <h2>NOTA DE PAGAMENTO</h2>
              <div className="btns_cabecalho">
                <div className="lista_cliente">
                  {carregando ? <span>Carregando...</span> : (
                    <select
                      className="seletor_cliente"
                      value={clienteSelecionadoId}
                      onChange={(e) => atualizarBoletaAtual({ clienteSelecionadoId: e.target.value })}
                    >
                      <option value="" disabled>Selecione o {tipoNota === "ENTRADA" ? "Fornecedor" : "Cliente"}</option>
                      {clientes.map(c => (
                        <option key={c.id || c.idCliente || c.idFornecedor} value={c.id || c.idCliente || c.idFornecedor}>
                          {c.nome || c.razaoSocial}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <button type="button" className="botao_adicionar" onClick={adicionarItem}>ADICIONAR PRODUTO</button>
                <button type="button" className="botao_adicionar" onClick={limparBoleta} disabled={itensBoleta.length === 0}>REMOVER TODOS</button>
              </div>
            </div>

            <div className="separacao"></div>

            <div className="rolagem_tabela">
              <table className="tabela">
                <thead className="cabecalho_tabela">
                  <tr>
                    <th>Num</th><th>Produto</th><th>Peso (Kg)</th><th>Valor</th><th>Total</th><th>Qtd. Bags</th><th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {itensBoleta.length === 0 ? (
                    <tr><td colSpan={7}>Nenhum produto adicionado.</td></tr>
                  ) : (
                    itensBoleta.map((item, index) => (
                      <tr key={item.idLinha}>
                        <td>{index + 1}</td>
                        <td>
                          <select
                            className="select_produto"
                            value={item.produtoId}
                            onChange={(e) => atualizarItem(item.idLinha, "produtoId", e.target.value)}
                          >
                            <option value="">Selecione</option>
                            {produtos.map(p => (
                              <option key={p.id || p.idProduto} value={p.id || p.idProduto}>{p.nome || p.descricao}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input placeholder="Inserir valor" type="number" min="0" step="0.01" className="inputItem" value={item.peso} onChange={(e) => atualizarItem(item.idLinha, "peso", e.target.value)} />
                        </td>
                        <td>{formatarMoeda(item.valorUnitario)}</td>
                        <td>{formatarMoeda(item.total)}</td>
                        <td>
                          <input placeholder="Informar Qtd. Bags" type="number" min="0" step="1" className="inputItem" value={item.bags} onChange={(e) => atualizarItem(item.idLinha, "bags", e.target.value)} />
                        </td>
                        <td>
                          <Tippy content="Excluir fornecedor" theme="light">
                            <div type="button" onClick={() => removerItem(item.idLinha)}>
                              <FaTrashAlt className="trashAlt" />
                            </div>
                          </Tippy>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <aside className="conteudo_lateral">
          <div className="caixa_info">
            <p className="titulo_lateral">Informações da Nota</p>
            <div className="lista_info">
              <div className="linha_info"><span>NOME</span><strong>{nomeCliente}</strong></div>
              <div className="linha_info"><span>TABELA</span><strong>{nomeTabela}</strong></div>
              <div className="linha_info">
                <span>CLASSE</span>
                <button className="botao_toggle_info" onClick={() => atualizarBoletaAtual(b => ({ ...b, classeNota: b.classeNota === "RETIRADA" ? "LOCAL" : "RETIRADA" }))}>{classeNota}</button>
              </div>
              <div className="linha_info">
                <span>TIPO</span>
                <button className="botao_toggle_info" onClick={() => atualizarBoletaAtual(b => ({ ...b, tipoNota: b.tipoNota === "SAÍDA" ? "ENTRADA" : "SAÍDA" }))}>{tipoNota}</button>
              </div>
            </div>
          </div>

          <div className="caixa_info caixa_acoes">
            
            <div className="card_total">
              <p className="label_total">Valor Total</p>
              <p className="valor_total">{formatarMoeda(resumo.total)}</p>
              <div className="divisor_total" />
              <div className="detalhes_total">
                <span>{itensBoleta.length} produto(s)</span>
                <span>{resumo.bags} bag(s)</span>
                <span>{resumo.peso.toFixed(2)} Kg</span>
              </div>
            </div>

            <p className="titulo_lateral">Ações da Nota</p>
            <div className="botoes_acao">
              <button
                type="button"
                className={`botao_confirmar ${pagamentoConfirmado ? "botao_confirmar--confirmado" : ""}`}
                onClick={pagamentoConfirmado ? () => atualizarBoletaAtual({ pagamentoConfirmado: false }) : confirmarPagamento}
                disabled={salvandoNota}
              >
                {salvandoNota ? "SALVANDO..." : (pagamentoConfirmado ? "PAGAMENTO CONFIRMADO ✔" : "CONFIRMAR PAGAMENTO")}
              </button>
              <button type="button" onClick={gerarNotaFiscal}>GERAR NOTA FISCAL</button>
              <button type="button" className="botao_copiar">
                <span className="texto_copiar">Copiar Nota</span>
                <span className="icone_copiar texto_copiar">⧉</span>
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Boleta;
