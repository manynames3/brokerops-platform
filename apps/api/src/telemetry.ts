export function initializeTelemetry() {
  return {
    serviceName: process.env.OTEL_SERVICE_NAME || "brokerops-api"
  };
}
