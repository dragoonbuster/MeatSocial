import { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  // Delete existing entries
  await knex('verification_nodes').del();

  // Insert initial verification nodes
  await knex('verification_nodes').insert([
    {
      id: 'sf-downtown-001',
      name: 'San Francisco Downtown Node',
      description: 'Main verification center in downtown San Francisco',
      location: 'San Francisco, CA',
      latitude: 37.7749,
      longitude: -122.4194,
      public_key: 'ed25519_public_key_placeholder_sf_001', // This will be generated during actual deployment
      operator_name: 'MeatSocial SF Operations',
      operator_email: 'sf-ops@meatsocial.com',
      is_active: true,
      verification_count: 0
    },
    {
      id: 'austin-central-001',
      name: 'Austin Central Node',
      description: 'Verification center in central Austin',
      location: 'Austin, TX',
      latitude: 30.2672,
      longitude: -97.7431,
      public_key: 'ed25519_public_key_placeholder_austin_001',
      operator_name: 'MeatSocial Austin Operations',
      operator_email: 'austin-ops@meatsocial.com',
      is_active: true,
      verification_count: 0
    },
    {
      id: 'nyc-manhattan-001',
      name: 'New York Manhattan Node',
      description: 'Verification center in Manhattan, NYC',
      location: 'New York, NY',
      latitude: 40.7128,
      longitude: -74.0060,
      public_key: 'ed25519_public_key_placeholder_nyc_001',
      operator_name: 'MeatSocial NYC Operations',
      operator_email: 'nyc-ops@meatsocial.com',
      is_active: true,
      verification_count: 0
    },
    {
      id: 'seattle-downtown-001',
      name: 'Seattle Downtown Node',
      description: 'Verification center in downtown Seattle',
      location: 'Seattle, WA',
      latitude: 47.6062,
      longitude: -122.3321,
      public_key: 'ed25519_public_key_placeholder_seattle_001',
      operator_name: 'MeatSocial Seattle Operations',
      operator_email: 'seattle-ops@meatsocial.com',
      is_active: true,
      verification_count: 0
    },
    {
      id: 'denver-downtown-001',
      name: 'Denver Downtown Node',
      description: 'Verification center in downtown Denver',
      location: 'Denver, CO',
      latitude: 39.7392,
      longitude: -104.9903,
      public_key: 'ed25519_public_key_placeholder_denver_001',
      operator_name: 'MeatSocial Denver Operations',
      operator_email: 'denver-ops@meatsocial.com',
      is_active: true,
      verification_count: 0
    }
  ]);
}