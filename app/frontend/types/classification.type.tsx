type ClassificationProperty = {
  slug: string,
  name: string,
  segments: boolean | Array<object>
}

export default interface Classification {
  id: number,
  name: string,
  properties: ClassificationProperty[]
}
