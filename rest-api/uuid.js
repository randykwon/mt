
import uuid4 from 'uuid'

const uuid = () => {
  const tokens = uuid().split('-')
  return tokens[2] + tokens[1] + tokens[0] + tokens[3] + tokens[4]
}

export {
  uuid
}