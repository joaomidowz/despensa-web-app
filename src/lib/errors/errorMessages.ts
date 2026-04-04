const errorMessages: Record<string, string> = {
  HOUSEHOLD_REQUIRED: "Voce precisa entrar em uma casa antes de continuar.",
  PRICE_MISMATCH: "Os valores do recibo nao batem. Revise os itens antes de confirmar.",
  SCAN_EXTRACTION_FAILED: "Nao conseguimos ler esse cupom. Tente outra imagem.",
  INVALID_STATUS_FILTER: "O filtro escolhido nao e valido.",
  UNAUTHORIZED: "Sua sessao expirou. Entre novamente.",
  NETWORK_ERROR: "Nao foi possivel conectar. Verifique sua internet e tente de novo.",
  UNKNOWN_ERROR: "Algo saiu do esperado. Tente novamente em instantes.",
};

export function getErrorMessage(code?: string) {
  if (!code) return errorMessages.UNKNOWN_ERROR;
  return errorMessages[code] ?? errorMessages.UNKNOWN_ERROR;
}
