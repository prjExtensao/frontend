import { useEffect, useState } from "react";
import styles from "../styles/DashboardStyle.module.css";
import { BarChart } from "@mui/x-charts/BarChart";
import api from "../services/apiClient";
import { isUsuarioComum } from "../services/usuarioService";

export default function Dashboard() {
    const usuarioComum = isUsuarioComum();

    const [chartWidth, setChartWidth] = useState(600);
    const [topProdutos, setTopProdutos] = useState([]);
    const [topFornecedores, setTopFornecedores] = useState([]);
    const [carregandoGraficos, setCarregandoGraficos] = useState(false);
    const [erroGraficos, setErroGraficos] = useState("");
    const [dataInicio, setDataInicio] = useState(() => {
        const hoje = new Date();
        return `${hoje.getFullYear()}-01-01`;
    });
    const [dataFim, setDataFim] = useState(() => {
        const hoje = new Date();
        return hoje.toISOString().slice(0, 10);
    });
    const [pesoTotal, setPesoTotal] = useState(0);
    const [totalVendas, setTotalVendas] = useState(0);
    const [totalCompras, setTotalCompras] = useState(0);
    const [rendimentoTotal, setRendimentoTotal] = useState(0);
    const normalizarNumero = (valor) => {
        const numero = Number(valor);
        return Number.isNaN(numero) ? 0 : numero;
    };

    const normalizarLista = (dados) => {
        if (Array.isArray(dados)) return dados;
        if (Array.isArray(dados?.content)) return dados.content;
        return [];
    };

    const formatarPeso = (valor) => {
        return `${new Intl.NumberFormat('pt-BR', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        }).format(valor)} KG`;
    };

    const formatarMoeda = (valor) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(valor);
    };

    useEffect(() => {
        document.title = "CR Metais | Dashboard"
    }, []);

    useEffect(() => {
        const handleResize = () => {
            const width = window.innerWidth;
            if (width < 480) {
                setChartWidth(Math.min(width - 40, 350));
            } else if (width < 768) {
                setChartWidth(Math.min(width - 60, 500));
            } else if (width < 1200) {
                setChartWidth(Math.min(width - 100, 600));
            } else {
                setChartWidth(630);
            }
        };

        handleResize();
        window.addEventListener('resize', handleResize);

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        setRendimentoTotal(totalVendas - totalCompras);
    }, [totalVendas, totalCompras]);

    if (usuarioComum) {
        return null;
    }

    const carregarGraficos = async (inicio, fim) => {
        setCarregandoGraficos(true);
        setErroGraficos("");

        try {
            const params = { dataInicio: inicio, dataFim: fim };

            const [resProdutos, resFornecedores, resEstoque, resVendas, resCompras] = await Promise.all([
                api.get("/produtos/top-peso-vendido", { params }),
                api.get("/fornecedores/top-rendimento", { params }),
                api.get("/estoque/total-produtos", { params }),
                api.get("/vendas/montante-total", { params }),
                api.get("/compra/montante-total", { params }),
            ]);

            const dadosProdutos = resProdutos.data;
            const dadosFornecedores = resFornecedores.data;
            setPesoTotal(resEstoque.data);
            setTotalVendas(resVendas.data);
            setTotalCompras(resCompras.data);

            const produtosFormatados = normalizarLista(dadosProdutos)
                .map((item) => ({
                    categoria:
                        item?.nome ||
                        item?.nomeProduto ||
                        item?.nome_produto ||
                        "Sem nome",
                    valor: normalizarNumero(
                        item?.totalPesoVendido ??
                        item?.total_peso_vendido ??
                        item?.pesoTotal ??
                        item?.total
                    ),
                }))
                .slice(0, 10);

            const fornecedoresFormatados = normalizarLista(dadosFornecedores)
                .map((item) => ({
                    categoria:
                        item?.apelido ||
                        item?.nome ||
                        item?.razaoSocial ||
                        item?.razao_social ||
                        "Sem nome",
                    valor: normalizarNumero(
                        item?.totalRendimento ??
                        item?.total_rendimento ??
                        item?.rendimentoTotal ??
                        item?.total
                    ),
                }))
                .slice(0, 10);

            setTopProdutos(produtosFormatados);
            setTopFornecedores(fornecedoresFormatados);
        } catch {
            setErroGraficos("Não foi possível carregar os gráficos.");
            setTopProdutos([]);
            setTopFornecedores([]);
            setTotalVendas(0);
            setTotalCompras(0);
            setRendimentoTotal(0);
        } finally {
            setCarregandoGraficos(false);
        }
    };

    useEffect(() => {
        carregarGraficos(dataInicio, dataFim);
    }, []);

    const aoPesquisar = () => {
        carregarGraficos(dataInicio, dataFim);
    };

    return (
        <div className={styles.container_dash}>
            <div className={styles.container_kpi}>

                <div className={styles.cards_kpi}>
                    <div className={styles.card_kpi}>
                        <p className={styles.titulo_kpi}>Peso total:</p>
                        <div className={styles.container_valor_card}>
                            <p className={styles.valor_kpi}>
                                {carregandoGraficos ? '...' : formatarPeso(pesoTotal)}
                            </p>
                        </div>
                    </div>
                    <div className={styles.card_kpi}>
                        <p className={styles.titulo_kpi}>Rendimento:</p>
                        <div className={styles.container_valor_card}>
                            <p className={styles.valor_kpi}>
                                {carregandoGraficos ? '...' : formatarMoeda(rendimentoTotal)}
                            </p>
                        </div>
                    </div>
                    <div className={styles.card_kpi}>
                        <p className={styles.titulo_kpi}>Total de vendas:</p>
                        <div className={styles.container_valor_card}>
                            <p className={styles.valor_kpi}>
                                {carregandoGraficos ? '...' : formatarMoeda(totalVendas)}
                            </p>
                        </div>
                    </div>
                    <div className={styles.card_kpi}>
                        <p className={styles.titulo_kpi}>Total de compras:</p>
                        <div className={styles.container_valor_card}>
                            <p className={styles.valor_kpi}>
                                {carregandoGraficos ? '...' : formatarMoeda(totalCompras)}
                            </p>
                        </div>
                    </div>
                </div>

                <div className={styles.date_filter}>

                    <div className={styles.search_button_container}>
                        <button
                            className={`${styles.input} ${styles.search_button}`}
                            type="button"
                            onClick={aoPesquisar}
                            disabled={carregandoGraficos}
                        >
                            Pesquisar
                        </button>
                    </div>

                    <div>
                        <p className={styles.tit_data}>Data inicial</p>
                        <input
                            className={styles.input}
                            type="date"
                            value={dataInicio}
                            onChange={(event) => setDataInicio(event.target.value)}
                        />
                    </div>
                    <div>
                        <p className={styles.tit_data}>Data final</p>
                        <input
                            className={styles.input}
                            type="date"
                            value={dataFim}
                            onChange={(event) => setDataFim(event.target.value)}
                        />
                    </div>
                </div>
            </div>
            <div className={styles.container_graficos}>
                {carregandoGraficos && <p>Carregando gráficos...</p>}
                {!carregandoGraficos && erroGraficos && <p>{erroGraficos}</p>}

                <div className={styles.grafico}>
                    <h3 className={styles.titulo_grafico}>TOP 10 PRODUTOS</h3>
                    <BarChart
                        xAxis={[
                            {
                                id: 'barCategories',
                                data: topProdutos.map((item) => item.categoria),
                                scaleType: 'band',
                            },
                        ]}
                        series={[
                            {
                                data: topProdutos.map((item) => item.valor),
                                color: '#FACC15',
                            },
                        ]}
                        width={chartWidth}
                        height={300}
                    />
                </div>

                <div className={styles.grafico}>
                    <h3 className={styles.titulo_grafico}>TOP 10 FORNECEDORES</h3>
                    <BarChart
                        layout="horizontal"
                        yAxis={[
                            {
                                id: 'barCategories',
                                data: topFornecedores.map((item) => item.categoria),
                                scaleType: 'band',
                            },
                        ]}
                        series={[
                            {
                                data: topFornecedores.map((item) => item.valor),
                                color: '#60A5FA',
                            },
                        ]}
                        width={chartWidth}
                        height={300}
                    />
                </div>
            </div>
        </div>
    )
}