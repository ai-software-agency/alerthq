/** Configuration for the GCP Cloud Monitoring provider adapter. */
export interface GcpMonitoringProviderConfig {
  /** GCP project ID to scan for alert policies. */
  projectId: string;

  /** Optional path to a service account JSON key file. */
  keyFilename?: string;

  /** Optional inline service account credentials. */
  credentials?: {
    client_email: string;
    private_key: string;
  };
}
