#!/bin/bash
curl -X POST http://localhost:5000/api/payments/webhook/sms-forwarder \
  -H "Content-Type: application/json" \
  -H "x-sms-secret: my_super_secret_password_123" \
  -d '{"message":"You have received Tk 150.00 from 01912345678. Fee Tk 0.00. Balance Tk 100.00. TrxID ABCD123456 at 23/07/2023 10:00"}'
