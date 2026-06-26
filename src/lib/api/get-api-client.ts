/**
 * Get a new API client instance with token from cookies
 * Use this in server actions for request-scoped authentication
 */

import { cookies } from 'next/headers';
import { ApiClient } from './client';

export async function getApiClient(): Promise<ApiClient> {
  const client = new ApiClient();
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('auth_token')?.value;
  if (accessToken) {
    client.setToken(accessToken);
  }
  return client;
}
