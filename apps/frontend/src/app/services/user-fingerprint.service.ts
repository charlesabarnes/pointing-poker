import { Injectable } from '@angular/core';
import FingerprintJS from '@fingerprintjs/fingerprintjs';

/**
 * Service to generate and manage browser fingerprint for persistent user identification
 * This allows tracking users even when they change their display name
 *
 * Uses FingerprintJS library for accurate and stable browser fingerprinting
 */
@Injectable({
  providedIn: 'root'
})
export class UserFingerprintService {
  private readonly FINGERPRINT_KEY = 'POKER_USER_FINGERPRINT';
  private fingerprint: string | null = null;
  private fpPromise: Promise<any>;

  constructor() {
    // Initialize FingerprintJS agent
    this.fpPromise = FingerprintJS.load();
    // Load fingerprint from localStorage or generate new one
    this.initializeFingerprint();
  }

  /**
   * Get the current user's fingerprint
   * Returns the cached fingerprint synchronously
   */
  public getFingerprint(): string {
    if (!this.fingerprint) {
      // If not yet loaded, return stored value or temporary placeholder
      const stored = localStorage.getItem(this.FINGERPRINT_KEY);
      if (stored) {
        return stored;
      }
      // Generate a temporary ID until the real fingerprint is ready
      const tempId = this.generateTemporaryId();
      this.fingerprint = tempId;
      return tempId;
    }
    return this.fingerprint;
  }

  /**
   * Initialize fingerprint asynchronously
   */
  private async initializeFingerprint(): Promise<void> {
    // Try to get existing fingerprint from localStorage
    const stored = localStorage.getItem(this.FINGERPRINT_KEY);
    if (stored) {
      this.fingerprint = stored;
      return;
    }

    // Generate new fingerprint using FingerprintJS
    try {
      const fp = await this.fpPromise;
      const result = await fp.get();
      const visitorId = result.visitorId;

      this.fingerprint = visitorId;
      localStorage.setItem(this.FINGERPRINT_KEY, visitorId);
    } catch (error) {
      console.error('Failed to generate fingerprint:', error);
      // Fallback to temporary ID if fingerprinting fails
      const tempId = this.generateTemporaryId();
      this.fingerprint = tempId;
      localStorage.setItem(this.FINGERPRINT_KEY, tempId);
    }
  }

  /**
   * Generate a temporary ID for cases where fingerprinting isn't ready or fails
   * This ensures the app can function immediately
   */
  private generateTemporaryId(): string {
    return `temp_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Clear the stored fingerprint (useful for testing)
   */
  public clearFingerprint(): void {
    localStorage.removeItem(this.FINGERPRINT_KEY);
    this.fingerprint = null;
  }

  /**
   * Force regenerate the fingerprint
   * Useful for testing or when you want a fresh fingerprint
   */
  public async regenerateFingerprint(): Promise<string> {
    try {
      const fp = await this.fpPromise;
      const result = await fp.get();
      const visitorId = result.visitorId;

      this.fingerprint = visitorId;
      localStorage.setItem(this.FINGERPRINT_KEY, visitorId);
      return visitorId;
    } catch (error) {
      console.error('Failed to regenerate fingerprint:', error);
      throw error;
    }
  }
}
