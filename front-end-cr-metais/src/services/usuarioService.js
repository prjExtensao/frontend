import axios from "axios";
import { jwtDecode } from "jwt-decode";
import api from "./apiClient"

function lerJsonStorage(chave) {
  const valor = localStorage.getItem(chave);
  if (!valor) return null;

  try {
    return JSON.parse(valor);
  } catch {
    return null;
  }
}

function obterTokenDecodificado() {
  const token = localStorage.getItem("token");
  if (!token) return null;

  try {
    return jwtDecode(token);
  } catch {
    return null;
  }
}

function normalizarCargo(valor) {
  if (typeof valor !== "string") return "";

  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

function extrairCargoDeColecao(colecao) {
  if (!Array.isArray(colecao)) return "";

  for (const item of colecao) {
    const valor = typeof item === "string"
      ? item
      : item?.authority ?? item?.role ?? item?.cargo ?? item?.nome;

    const cargo = normalizarCargo(valor);
    if (cargo) return cargo;
  }

  return "";
}

function extrairCargo(origem) {
  if (!origem || typeof origem !== "object") return "";

  const candidatosDiretos = [
    origem.cargo,
    origem.role,
    origem.perfil,
    origem.tipoUsuario,
    origem.tipo,
    origem.authority,
  ];

  const direto = candidatosDiretos
    .map(normalizarCargo)
    .find(Boolean);

  if (direto) return direto;

  const colecoes = [origem.roles, origem.authorities, origem.perfis];

  for (const colecao of colecoes) {
    const cargoColecao = extrairCargoDeColecao(colecao);
    if (cargoColecao) return cargoColecao;
  }

  const pilha = [origem];
  const visitados = new Set();

  while (pilha.length > 0) {
    const atual = pilha.pop();

    if (!atual || typeof atual !== "object" || visitados.has(atual)) {
      continue;
    }

    visitados.add(atual);

    const cargoAtual = [
      atual.cargo,
      atual.role,
      atual.perfil,
      atual.tipoUsuario,
      atual.tipo,
      atual.authority,
      atual.nomePerfil,
      atual.descricaoPerfil,
    ]
      .map(normalizarCargo)
      .find(Boolean);

    if (cargoAtual) return cargoAtual;

    const cargoColecao = extrairCargoDeColecao(atual.roles)
      || extrairCargoDeColecao(atual.authorities)
      || extrairCargoDeColecao(atual.perfis);

    if (cargoColecao) return cargoColecao;

    for (const valor of Object.values(atual)) {
      if (valor && typeof valor === "object") {
        pilha.push(valor);
      }
    }
  }

  return "";
}

export function extrairUsuarioPersistivel(origem) {
  if (!origem || typeof origem !== "object") return null;

  const pilha = [origem];
  const visitados = new Set();

  while (pilha.length > 0) {
    const atual = pilha.pop();

    if (!atual || typeof atual !== "object" || visitados.has(atual)) {
      continue;
    }

    visitados.add(atual);

    const cargo = extrairCargo(atual);
    const id = atual.idUsuario ?? atual.id ?? atual.sub;
    const email = atual.email ?? atual.username ?? atual.login;

    if (cargo || id || email) {
      return atual;
    }

    for (const valor of Object.values(atual)) {
      if (valor && typeof valor === "object") {
        pilha.push(valor);
      }
    }
  }

  return origem;
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url ?? "";

    const ehBloqueioAutoExclusao = status === 403 && url.includes("/usuarios/") && error.config?.method === "delete";

    if (status === 401 || (status === 403 && !ehBloqueioAutoExclusao)) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

export function getUsuarioLogadoId() {
  const decoded = obterTokenDecodificado();
  if (decoded) {
    return Number(decoded.idUsuario ?? decoded.sub ?? decoded.id);
  }

  const usuario = getUsuarioLogado();
  return Number(usuario?.idUsuario ?? usuario?.id ?? null);
}

export function getUsuarioLogado() {
  return lerJsonStorage("usuario");
}

export function salvarUsuarioLogado(usuario) {
  if (!usuario) {
    localStorage.removeItem("usuario");
    return;
  }

  localStorage.setItem("usuario", JSON.stringify(usuario));
}

export function getUsuarioLogadoCargo() {
  const usuarioStorage = getUsuarioLogado();
  const cargoUsuario = extrairCargo(usuarioStorage);
  if (cargoUsuario) return cargoUsuario;

  return extrairCargo(obterTokenDecodificado());
}

export function isUsuarioComum() {
  const cargo = getUsuarioLogadoCargo();
  return cargo.includes("COMUM") || cargo.includes("ROLE_COMUM");
}

export function isUsuarioAdministrador() {
  const cargo = getUsuarioLogadoCargo();
  return cargo.includes("ADMIN") || cargo === "ADM";
}

export const cadastrarUsuario = async (dadosUsuario) => {
  try {
    const response = await api.post("/usuarios", dadosUsuario);
    return response;
  } catch (error) {
    throw error;
  }
};

export async function listarUsuarios() {
  const response = await api.get("/usuarios");
  return response.data;
}

export async function buscarUsuarioPorId(id) {
  const response = await api.get(`/usuarios/${id}`);
  return response.data;
}

export async function excluirUsuario(id) {
  return await api.delete(`/usuarios/${id}`);
}

export async function editarUsuario(id, dados) {
  return await api.put(`/usuarios/${id}`, dados);
}