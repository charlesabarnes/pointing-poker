import { Injectable } from '@angular/core';
import FingerprintJS from '@fingerprintjs/fingerprintjs';


@Injectable({
  providedIn: 'root'
})
export class UserFingerprintService {
  private readonly FINGERPRINT_KEY = 'POKER_USER_FINGERPRINT';
  private fingerprint: string | null = null;
  private fpPromise: Promise<any>;

  constructor() {
    this.fpPromise = FingerprintJS.load();
    this.initializeFingerprint();
  }

  public getFingerprint(): string {
    if (!this.fingerprint) {
      const stored = localStorage.getItem(this.FINGERPRINT_KEY);
      if (stored) {
        return stored;
      }
      const tempId = this.generateTemporaryId();
      this.fingerprint = tempId;
      return tempId;
    }
    return this.fingerprint;
  }


  private async initializeFingerprint(): Promise<void> {
    // Try to get existing fingerprint from localStorage
    const stored = localStorage.getItem(this.FINGERPRINT_KEY);
    if (stored) {
      this.fingerprint = stored;
      return;
    }

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

  private generateTemporaryId(): string {
    return `temp_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }


  public clearFingerprint(): void {
    localStorage.removeItem(this.FINGERPRINT_KEY);
    this.fingerprint = null;
  }

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
