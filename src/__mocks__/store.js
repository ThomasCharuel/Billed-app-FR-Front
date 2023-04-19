import { bills, newBill } from "../fixtures/bills"

const mockedBills = {
  list() {
    return Promise.resolve(bills)
  },
  create(bill) {
    return Promise.resolve({fileUrl: newBill.fileUrl, key: '1234'})
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

