import axiosInstance from '@/api/axiosInstance'
import { MFADevice, MFASetupData, MFASetupResponse, MFAVerificationData } from '@/types'

class MFAService {
  async getDevices(): Promise<MFADevice[]> {
    const response = await axiosInstance.get('/users/mfa/devices/')
    return response.data
  }

  async setupMFA(setupData: MFASetupData): Promise<MFASetupResponse> {
    const response = await axiosInstance.post('/users/mfa/setup/', setupData)
    return response.data
  }

  async verifyMFASetup(verificationData: MFAVerificationData): Promise<{ message: string; backup_codes: string[] }> {
    const response = await axiosInstance.post('/users/mfa/verify/', verificationData)
    return response.data
  }

  async verifyMFALogin(verificationData: MFAVerificationData): Promise<{ message: string }> {
    const response = await axiosInstance.post('/users/mfa/verify-login/', verificationData)
    return response.data
  }

  async disableMFA(password: string): Promise<{ message: string }> {
    const response = await axiosInstance.post('/users/mfa/disable/', { password })
    return response.data
  }

  async regenerateBackupCodes(password: string): Promise<{ message: string; backup_codes: string[] }> {
    const response = await axiosInstance.post('/users/mfa/backup-codes/regenerate/', { password })
    return response.data
  }

  async resendSMSCode(): Promise<{ message: string }> {
    const response = await axiosInstance.post('/users/mfa/resend-sms/')
    return response.data
  }

  async sendSMSMFACode(deviceId: string): Promise<{ message: string }> {
    const response = await axiosInstance.post('/users/mfa/send-sms-code/', { device_id: deviceId })
    return response.data
  }
}

export default new MFAService()