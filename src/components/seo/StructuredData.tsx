import type { StructuredDataObject } from '@/lib/structured-data'

interface StructuredDataProps {
  data: StructuredDataObject | StructuredDataObject[]
}

/** Render JSON-LD while escaping characters that could terminate the script tag. */
export default function StructuredData({ data }: StructuredDataProps) {
  const schemas = Array.isArray(data) ? data : [data]

  return (
    <>
      {schemas.map((schema, index) => (
        <script
          key={`${String(schema['@type'] || 'schema')}-${index}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(schema).replace(/</g, '\\u003c'),
          }}
        />
      ))}
    </>
  )
}
