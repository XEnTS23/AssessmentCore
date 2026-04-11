import { supabase } from './supabaseClient';

export interface RedeemResult {
  success: boolean;
  error?: string;
}

/**
 * Validates a Batch Creator access token and permanently unlocks
 * Batch Creator for the given user account.
 *
 * A token is valid when:
 *  - it exists in `batch_creator_tokens`
 *  - is_active = true
 *  - redeemed_by IS NULL (never used before)
 *
 * On success the token is marked as redeemed and
 * user_usage.batch_creator_access is set to true.
 */
export async function redeemBatchCreatorToken(
  token: string,
  userId: string
): Promise<RedeemResult> {
  const trimmed = token.trim();
  if (!trimmed) {
    return { success: false, error: 'Please enter an access token.' };
  }

  // 1. Look up the token
  const { data: tokenRow, error: lookupError } = await supabase
    .from('batch_creator_tokens')
    .select('id, is_active, redeemed_by')
    .eq('token', trimmed)
    .maybeSingle();

  if (lookupError) {
    console.error('Token lookup error:', lookupError);
    return { success: false, error: 'Could not validate token. Please try again.' };
  }

  if (!tokenRow) {
    return { success: false, error: 'Invalid access token. Please check and try again.' };
  }

  if (!tokenRow.is_active) {
    return { success: false, error: 'This token has been revoked. Please contact support.' };
  }

  if (tokenRow.redeemed_by !== null) {
    return { success: false, error: 'This token has already been used.' };
  }

  // 2. Mark token as redeemed
  const { error: updateTokenError } = await supabase
    .from('batch_creator_tokens')
    .update({ redeemed_by: userId, redeemed_at: new Date().toISOString() })
    .eq('id', tokenRow.id);

  if (updateTokenError) {
    console.error('Token redemption error:', updateTokenError);
    return { success: false, error: 'Could not redeem token. Please try again.' };
  }

  // 3. Unlock Batch Creator on the user's usage record
  const { error: accessError } = await supabase
    .from('user_usage')
    .update({ batch_creator_access: true })
    .eq('user_id', userId);

  if (accessError) {
    console.error('Access grant error:', accessError);
    // Roll back token redemption so the user can try again
    await supabase
      .from('batch_creator_tokens')
      .update({ redeemed_by: null, redeemed_at: null })
      .eq('id', tokenRow.id);
    return { success: false, error: 'Could not activate access. Please try again.' };
  }

  return { success: true };
}
