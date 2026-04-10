import { useState } from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag, Facebook, MessageCircle, BarChart3, CheckCircle, XCircle, ExternalLink, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  iconBg: string;
  isConnected: boolean;
  fields: { key: string; label: string; placeholder: string; type: 'text' | 'password' }[];
}

const integrations: Integration[] = [
  {
    id: 'shopify',
    name: 'Shopify',
    description: 'Sync products and orders from your Shopify store',
    icon: ShoppingBag,
    iconBg: 'bg-green-500',
    isConnected: true,
    fields: [
      { key: 'store_url', label: 'Store URL', placeholder: 'yourstore.myshopify.com', type: 'text' },
      { key: 'api_key', label: 'API Key', placeholder: 'shppa_xxxxxxxxxx', type: 'password' },
      { key: 'api_secret', label: 'API Secret', placeholder: 'shpss_xxxxxxxxxx', type: 'password' },
    ],
  },
  {
    id: 'meta',
    name: 'Meta Ads',
    description: 'Import leads from Facebook and Instagram ads',
    icon: Facebook,
    iconBg: 'bg-blue-600',
    isConnected: true,
    fields: [
      { key: 'access_token', label: 'Access Token', placeholder: 'EAAxxxxxx...', type: 'password' },
      { key: 'ad_account_id', label: 'Ad Account ID', placeholder: 'act_xxxxxxxxxx', type: 'text' },
    ],
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Cloud API',
    description: 'Send messages and receive lead inquiries via WhatsApp',
    icon: MessageCircle,
    iconBg: 'bg-emerald-500',
    isConnected: false,
    fields: [
      { key: 'phone_number_id', label: 'Phone Number ID', placeholder: 'Enter phone number ID', type: 'text' },
      { key: 'access_token', label: 'Access Token', placeholder: 'Enter access token', type: 'password' },
      { key: 'webhook_verify_token', label: 'Webhook Verify Token', placeholder: 'Your verify token', type: 'password' },
    ],
  },
  {
    id: 'ga4',
    name: 'Google Analytics 4',
    description: 'Track conversions and attribute leads to campaigns',
    icon: BarChart3,
    iconBg: 'bg-orange-500',
    isConnected: false,
    fields: [
      { key: 'measurement_id', label: 'Measurement ID', placeholder: 'G-XXXXXXXXXX', type: 'text' },
      { key: 'api_secret', label: 'API Secret', placeholder: 'Enter API secret', type: 'password' },
    ],
  },
];

export default function AdminIntegrationsPage() {
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  const toggleSecret = (fieldKey: string) => {
    setShowSecrets((prev) => ({ ...prev, [fieldKey]: !prev[fieldKey] }));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Integrations</h1>
        <p className="text-muted-foreground">Connect external services to your CRM</p>
      </div>

      {/* Integration Cards */}
      <div className="grid gap-6">
        {integrations.map((integration) => (
          <Card key={integration.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', integration.iconBg)}>
                    <integration.icon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{integration.name}</CardTitle>
                      {integration.isConnected ? (
                        <Badge className="bg-success/10 text-success border-0">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Connected
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <XCircle className="h-3 w-3 mr-1" />
                          Not Connected
                        </Badge>
                      )}
                    </div>
                    <CardDescription>{integration.description}</CardDescription>
                  </div>
                </div>
                <Button variant="ghost" size="icon">
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {integration.fields.map((field) => (
                  <div key={field.key} className="grid grid-cols-3 gap-4 items-center">
                    <Label htmlFor={`${integration.id}-${field.key}`} className="text-right text-sm">
                      {field.label}
                    </Label>
                    <div className="col-span-2 relative">
                      <Input
                        id={`${integration.id}-${field.key}`}
                        type={field.type === 'password' && !showSecrets[`${integration.id}-${field.key}`] ? 'password' : 'text'}
                        placeholder={field.placeholder}
                        defaultValue={integration.isConnected ? '••••••••••••' : ''}
                        className="pr-10"
                      />
                      {field.type === 'password' && (
                        <button
                          type="button"
                          onClick={() => toggleSecret(`${integration.id}-${field.key}`)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showSecrets[`${integration.id}-${field.key}`] ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                <Separator />
                <div className="flex justify-end gap-3">
                  <Button variant="outline">Test Connection</Button>
                  <Button>{integration.isConnected ? 'Update' : 'Connect'}</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </motion.div>
  );
}
