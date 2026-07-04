import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, FileText, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function Legal() {
  return (
    <div className="container max-w-4xl py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/configuracoes">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Termos e Privacidade</h1>
      </div>

      <Tabs defaultValue="privacy" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="privacy" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Privacidade
          </TabsTrigger>
          <TabsTrigger value="terms" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Termos de Uso
          </TabsTrigger>
        </TabsList>

        <TabsContent value="privacy">
          <Card>
            <CardHeader>
              <CardTitle>Política de Privacidade</CardTitle>
              <p className="text-sm text-muted-foreground">Última atualização: 27 de junho de 2025</p>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none space-y-4 text-sm text-muted-foreground">
              <section>
                <h3 className="text-base font-semibold text-foreground">1. Dados Coletados</h3>
                <p>O Eugê Financeiro coleta apenas os dados estritamente necessários para o funcionamento do serviço:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li><strong className="text-foreground">Dados de identificação:</strong> nome, email e método de login (via OAuth Manus)</li>
                  <li><strong className="text-foreground">Dados financeiros:</strong> transações, receitas, despesas, jobs, orçamentos e demais informações inseridas voluntariamente pelo usuário</li>
                  <li><strong className="text-foreground">Dados técnicos:</strong> logs de acesso, IP e user-agent para segurança</li>
                </ul>
              </section>

              <section>
                <h3 className="text-base font-semibold text-foreground">2. Finalidade do Tratamento</h3>
                <p>Seus dados são utilizados exclusivamente para:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Prover o serviço de gestão financeira pessoal/empresarial</li>
                  <li>Gerar relatórios, insights e projeções financeiras</li>
                  <li>Enviar notificações solicitadas (Telegram, push, email)</li>
                  <li>Garantir a segurança e integridade da conta</li>
                </ul>
              </section>

              <section>
                <h3 className="text-base font-semibold text-foreground">3. Compartilhamento</h3>
                <p>Seus dados financeiros <strong className="text-foreground">nunca são vendidos ou compartilhados</strong> com terceiros para fins de marketing. O compartilhamento ocorre apenas:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Com provedores de infraestrutura (banco de dados, armazenamento) sob contratos de confidencialidade</li>
                  <li>Quando você explicitamente autoriza (ex: compartilhar com contadora via convite)</li>
                  <li>Por obrigação legal ou ordem judicial</li>
                </ul>
              </section>

              <section>
                <h3 className="text-base font-semibold text-foreground">4. Seus Direitos (LGPD Art. 18)</h3>
                <p>Conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018), você tem direito a:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li><strong className="text-foreground">Acesso:</strong> visualizar todos os seus dados a qualquer momento no app</li>
                  <li><strong className="text-foreground">Portabilidade:</strong> exportar todos os seus dados em JSON (Configurações → Backup)</li>
                  <li><strong className="text-foreground">Correção:</strong> editar qualquer informação pessoal ou financeira</li>
                  <li><strong className="text-foreground">Eliminação:</strong> excluir permanentemente sua conta e todos os dados (Configurações → Excluir Conta)</li>
                  <li><strong className="text-foreground">Revogação:</strong> revogar consentimento a qualquer momento desconectando integrações</li>
                </ul>
              </section>

              <section>
                <h3 className="text-base font-semibold text-foreground">5. Segurança</h3>
                <p>Implementamos medidas técnicas para proteger seus dados:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Criptografia em trânsito (HTTPS/TLS)</li>
                  <li>Autenticação via OAuth com tokens JWT assinados</li>
                  <li>Rate limiting para prevenção de ataques</li>
                  <li>Headers de segurança (Helmet)</li>
                  <li>Acesso restrito ao proprietário da conta (ownerProcedure)</li>
                </ul>
              </section>

              <section>
                <h3 className="text-base font-semibold text-foreground">6. Retenção de Dados</h3>
                <p>Seus dados são mantidos enquanto sua conta estiver ativa. Ao excluir a conta, todos os dados são permanentemente removidos em até 24 horas, sem possibilidade de recuperação.</p>
              </section>

              <section>
                <h3 className="text-base font-semibold text-foreground">7. Contato</h3>
                <p>Para exercer seus direitos ou tirar dúvidas sobre privacidade, entre em contato pelo email: <strong className="text-foreground">contatoseghessi@gmail.com</strong></p>
              </section>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="terms">
          <Card>
            <CardHeader>
              <CardTitle>Termos de Uso</CardTitle>
              <p className="text-sm text-muted-foreground">Última atualização: 27 de junho de 2025</p>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none space-y-4 text-sm text-muted-foreground">
              <section>
                <h3 className="text-base font-semibold text-foreground">1. Aceitação</h3>
                <p>Ao utilizar o Eugê Financeiro, você concorda com estes termos. O serviço é fornecido pelo Estúdio Criativo Eugê como ferramenta de gestão financeira pessoal e empresarial.</p>
              </section>

              <section>
                <h3 className="text-base font-semibold text-foreground">2. Descrição do Serviço</h3>
                <p>O Eugê Financeiro é uma plataforma web para:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Controle de receitas e despesas (PF e PJ)</li>
                  <li>Gestão de jobs e projetos freelancer</li>
                  <li>Geração de relatórios e insights financeiros via IA</li>
                  <li>Controle de fluxo de caixa e projeções</li>
                  <li>Emissão de orçamentos e propostas</li>
                </ul>
              </section>

              <section>
                <h3 className="text-base font-semibold text-foreground">3. Responsabilidades do Usuário</h3>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Manter suas credenciais de acesso em sigilo</li>
                  <li>Inserir informações financeiras verdadeiras</li>
                  <li>Não utilizar o serviço para fins ilegais</li>
                  <li>Manter backup próprio de dados críticos</li>
                </ul>
              </section>

              <section>
                <h3 className="text-base font-semibold text-foreground">4. Limitações</h3>
                <ul className="list-disc pl-6 space-y-1">
                  <li>O serviço não substitui consultoria contábil ou fiscal profissional</li>
                  <li>Insights gerados por IA são sugestões, não recomendações financeiras</li>
                  <li>Não nos responsabilizamos por decisões financeiras baseadas exclusivamente no app</li>
                  <li>O serviço pode sofrer interrupções para manutenção</li>
                </ul>
              </section>

              <section>
                <h3 className="text-base font-semibold text-foreground">5. Propriedade Intelectual</h3>
                <p>O software, design e código do Eugê Financeiro são propriedade do Estúdio Criativo Eugê. Os dados financeiros inseridos permanecem de propriedade exclusiva do usuário.</p>
              </section>

              <section>
                <h3 className="text-base font-semibold text-foreground">6. Cancelamento</h3>
                <p>Você pode cancelar sua conta a qualquer momento em Configurações → Excluir Conta. Assinaturas ativas serão canceladas automaticamente. Dados são removidos permanentemente conforme nossa Política de Privacidade.</p>
              </section>

              <section>
                <h3 className="text-base font-semibold text-foreground">7. Alterações nos Termos</h3>
                <p>Podemos atualizar estes termos periodicamente. Alterações significativas serão comunicadas via notificação no app. O uso continuado após alterações constitui aceitação dos novos termos.</p>
              </section>

              <section>
                <h3 className="text-base font-semibold text-foreground">8. Foro</h3>
                <p>Estes termos são regidos pela legislação brasileira. Fica eleito o foro da comarca de Porto Alegre/RS para dirimir quaisquer controvérsias.</p>
              </section>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
