import { PageContainer } from '@/components/page-container';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ENV } from '@/lib/env';

export default function EnvDebug() {
  return (
    <PageContainer>
      <div className="max-w-4xl mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>Environment Variables Debug</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold mb-2">Raw Environment Variables</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">VITE_NETWORK:</span>{' '}
                    <code>{import.meta.env.VITE_NETWORK || 'undefined'}</code>
                  </div>
                  <div>
                    <span className="font-medium">VITE_ALLOW_FLW:</span>{' '}
                    <code>{import.meta.env.VITE_ALLOW_FLW || 'undefined'}</code>
                  </div>
                  <div>
                    <span className="font-medium">VITE_OWNER_ADDRESS:</span>{' '}
                    <code>{import.meta.env.VITE_OWNER_ADDRESS || 'undefined'}</code>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">Processed ENV Values</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">ENV.NETWORK:</span>{' '}
                    <code>{ENV.NETWORK}</code>
                  </div>
                  <div>
                    <span className="font-medium">ENV.ALLOW_FLW:</span>{' '}
                    <Badge variant={ENV.ALLOW_FLW ? 'default' : 'secondary'}>
                      {ENV.ALLOW_FLW ? 'true' : 'false'}
                    </Badge>
                  </div>
                  <div>
                    <span className="font-medium">ENV.OWNER_ADDRESS:</span>{' '}
                    <code>{ENV.OWNER_ADDRESS}</code>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="border-t pt-4 mt-4">
              <h3 className="font-semibold mb-2">FLW Feature Status</h3>
              <div className="space-y-2">
                <div>
                  <span className="font-medium">FLW Donations:</span>{' '}
                  <Badge variant={ENV.ALLOW_FLW ? 'default' : 'secondary'}>
                    {ENV.ALLOW_FLW ? 'ENABLED' : 'DISABLED'}
                  </Badge>
                </div>
                <div>
                  <span className="font-medium">Create Campaign FLW Option:</span>{' '}
                  <Badge variant={ENV.ALLOW_FLW ? 'default' : 'secondary'}>
                    {ENV.ALLOW_FLW ? 'Available' : 'Coming Soon'}
                  </Badge>
                </div>
                <div>
                  <span className="font-medium">Donation Modal FLW Button:</span>{' '}
                  <Badge variant={ENV.ALLOW_FLW ? 'default' : 'secondary'}>
                    {ENV.ALLOW_FLW ? 'Visible' : 'Hidden'}
                  </Badge>
                </div>
              </div>
            </div>
            
            <div className="border-t pt-4 mt-4">
              <h3 className="font-semibold mb-2">For Vercel Deployment</h3>
              <div className="bg-gray-100 p-4 rounded-lg">
                <p className="text-sm text-gray-700 mb-2">
                  To disable FLW donations in Vercel, set this environment variable:
                </p>
                <code className="block bg-gray-200 p-2 rounded text-sm">
                  VITE_ALLOW_FLW=false
                </code>
                <p className="text-sm text-gray-600 mt-2">
                  Make sure to redeploy after setting the environment variable.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}