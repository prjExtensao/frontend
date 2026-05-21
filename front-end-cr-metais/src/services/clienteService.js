import { API_URL } from "./apiClient";
 
export async function listarClientes() {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_URL}/clientes`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
 
  if (!res.ok) throw new Error("Erro ao listar clientes");
  return res.json();
}
 

export async function buscarContaPagamentoPorFornecedor(idFornecedor) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_URL}/contas-pagamentos/fornecedor/${idFornecedor}`, {
    //                      ↑ contas-pagamentos  (igual ao @RequestMapping)
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) throw new Error("Conta de pagamento não encontrada");
  return res.json();
}

export async function buscarClientePorId(id) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_URL}/clientes/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
 
  if (!res.ok) throw new Error("Cliente não encontrado");
  return res.json();
}
 
export async function cadastrarCliente(dto) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_URL}/clientes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(dto),
  });
 
  if (!res.ok) throw new Error("Erro ao cadastrar cliente");
  return res.json();
}
 
export async function atualizarCliente(id, dto) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_URL}/clientes/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(dto),
  });
 
  if (!res.ok) throw new Error("Erro ao atualizar cliente");
  return res.json();
}
 
export async function deletarCliente(id) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_URL}/clientes/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
 
  if (!res.ok) throw new Error("Erro ao deletar cliente");
}