/** HTTP statuses that must not carry a response body (Fetch Response constructor). */
export function isNullBodyStatus(status: number) {
  return status === 204 || status === 205 || status === 304;
}
