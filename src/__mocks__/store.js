import { bills, newBill } from "../fixtures/bills"

const mockedBills = {
  list() {
    return Promise.resolve(bills)
  },
  create(bill) {
    return Promise.resolve({fileUrl: newBill.fileUrl, key: newBill.id})
  },
  update(bill) {
    return Promise.resolve(newBill)
  },
}

export default {
  bills() {
    return mockedBills
  },
}

