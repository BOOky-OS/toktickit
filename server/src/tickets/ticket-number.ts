export function formatTicketNumber(sequence: bigint, ticketDate: Date): string {
  if (sequence <= 0n) {
    throw new Error("Ticket sequence must be positive.");
  }
  const year = ticketDate.getUTCFullYear();
  return `TKT-${year}-${sequence.toString().padStart(6, "0")}`;
}
