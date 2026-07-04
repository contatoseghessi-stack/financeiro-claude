# Calculator Fix Analysis

## Problem
The PriceCalculator page has a "Tipo de Job" dropdown with categories like:
- Vídeo Institucional
- Conteúdo p/ Redes Sociais
- Ensaio Fotográfico
- Cobertura de Evento
- Campanha de Marca
- Making Of
- Edição de Vídeo
- Filmagem com Drone
- Outro

But in the database, the `jobType` field only has "freelance" or "client" (business model type, not service type).
The job names reveal the actual service types (Fotos, Vídeo, Cobertura, Documentário, Campanha, etc.)

## Real data patterns:
- Coberturas/Eventos: R$500-6000 (avg ~R$1500-2500)
- Documentários: R$2200-5200
- Fotos (ensaio/evento): R$500-2500
- Vídeos (institucional/edição): R$800-2300
- Campanhas de marca: R$1600+
- Making Of: R$700-1200

## Solution
1. The calculator needs to use keyword matching on job names to categorize past jobs
2. When user selects a type, filter historical jobs by keywords in the name
3. Show the REAL average for that type, not the global average
4. The `jobType` field in schema is "freelance/client" - NOT the service type
5. Need to create a keyword-based classification system on the backend
