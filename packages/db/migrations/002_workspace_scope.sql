CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  workspace_key TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO organizations (name, workspace_key)
VALUES ('BrokerOps Demo Workspace', 'brokerops-local-demo-key')
ON CONFLICT (workspace_key) DO UPDATE SET name = EXCLUDED.name;

ALTER TABLE carriers ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

UPDATE carriers
SET organization_id = (SELECT id FROM organizations WHERE workspace_key = 'brokerops-local-demo-key')
WHERE organization_id IS NULL;

ALTER TABLE carriers ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE carriers DROP CONSTRAINT IF EXISTS carriers_name_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_carriers_org_name ON carriers(organization_id, name);

ALTER TABLE policies ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

UPDATE policies
SET organization_id = carriers.organization_id
FROM carriers
WHERE policies.carrier_id = carriers.id
  AND policies.organization_id IS NULL;

ALTER TABLE policies ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE policies DROP CONSTRAINT IF EXISTS policies_external_policy_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_policies_org_external_id ON policies(organization_id, external_policy_id);
CREATE INDEX IF NOT EXISTS idx_policies_org_carrier ON policies(organization_id, carrier_id);
