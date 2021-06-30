import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { Apollo, gql } from 'apollo-angular';
import _ from 'lodash';
import { throwServerError } from '@apollo/client/core';

const GET_USERS = gql`
query UserQuery {
  users {
    id
    last_name
    first_name
    email
    cards
    phone_number
    username
  }
}
`;

const INSERT_USERS = gql`
mutation UserMutation($cards: String!, $email: String!, $firstName: String!, $lastName: String!, $phoneNumber: String!, $username: String!){
  insert_users_one(object: {cards: $cards, email: $email, first_name: $firstName, last_name: $lastName, phone_number: $phoneNumber, username: $username}) {
    id
    cards
  }
}
`;

const UPDATE_USER_CARD = gql`
mutation UserMutation ($id: uuid!, $cards: String!){
  update_users_by_pk(pk_columns: {id: $id}, _set: {cards: $cards}) {
    id
    cards
  }
}
`;

const UPDATE_USER = gql`
mutation UserMutation ($id: uuid!, $email: String!, $firstName: String!, $lastName: String!, $phoneNumber: String!, $username: String!){
  update_users_by_pk(pk_columns: {id: $id}, _set: {email: $email, first_name: $firstName, last_name: $lastName, phone_number: $phoneNumber, username: $username}) {
    first_name
    id
    last_name
    phone_number
    username
    email
    cards
  }
}
`;

const DELETE_USERS = gql`
mutation UserMutation ($id: uuid!){
  delete_users_by_pk(id: $id) {
    id
    cards
  }
}
`;

interface User {
  id: string,
  last_name: string,
  first_name: string,
  email: string,
  cards: string,
  phone_number: string,
  username: string,
}

class Card {
  suit!: string;
  value!: string;
  get toStrCardValue() {
    return this.value + this.suit;
  }
}

const CARD_DECK = [
  "2C", "3C", "4C", "5C", "6C", "7C", "8C", "9C", "10C", "JC", "QC", "KC", "AC",
  "2H", "3H", "4H", "5H", "6H", "7H", "8H", "9H", "10H", "JH", "QH", "KH", "AH",
  "2D", "3D", "4D", "5D", "6D", "7D", "8D", "9D", "10D", "JD", "QD", "KD", "AD",
  "2S", "3S", "4S", "5S", "6S", "7S", "8S", "9S", "10S", "JS", "QS", "KS", "AS"
];

const CARD_RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

const CARD_SUITS = ['C', 'H', 'D', 'S'];

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit, OnDestroy {
  loading: boolean = false;
  users!: User[];

  editId: string = "eeee";
  editUserObj!: any;

  private querySubscription!: Subscription;


  sortPlayerHandsDebouce = _.debounce(this.sortPlayerHands, 700);
  constructor(private apollo: Apollo) { }

  ngOnInit(): void {

    this.RefreshUsers();
  }

  RefreshUsers() {
    this.querySubscription = this.apollo.watchQuery<any>({
      query: GET_USERS
    }).valueChanges
      .subscribe(({ data }) => {
        this.sortPlayerHandsDebouce(data.users);
      });
  }

  addUser() {
    if (!this.users.find(u => u.id === "") && this.users.length <= 26) {
      let newUser: any = { cards: "", id: "", first_name: "", last_name: "", username: "", email: "" };
      this.editId = newUser.id;
      this.editUserObj = JSON.parse(JSON.stringify(newUser));
      this.users.unshift(newUser);
    }
  }

  insertUser() {
    let usedCards: number[] = [];
    this.users.forEach(u => {
      usedCards.push(CARD_DECK.findIndex(i => i == u.cards.split(',')[0]));
      usedCards.push(CARD_DECK.findIndex(i => i == u.cards.split(',')[1]));
    }
    );
    let hand: Card[] = this.getNewHand(usedCards);

    let newHand = hand[0].toStrCardValue + "," + hand[1].toStrCardValue;

    this.apollo.mutate({
      mutation: INSERT_USERS,
      variables: {
        cards: newHand,
        email: this.editUserObj.email,
        firstName: this.editUserObj.first_name,
        lastName: this.editUserObj.last_name,
        phoneNumber: this.editUserObj.phone_number,
        username: this.editUserObj.username,
      }, // insert comment mutation
      refetchQueries: [{
        query: GET_USERS
      }]
    }).subscribe(({ data }) => {
      this.editId = "";
    }, (error) => {
      console.log('there was an error sending the query', error);
    });
  }

  editUser(user: any) {
    this.editId = user.id;
    this.editUserObj = JSON.parse(JSON.stringify(user));
  }

  saveUser(user: any) {
    const emailre = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    const phonere = /^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s\./0-9]*$/;
    if (!emailre.test(String(this.editUserObj.email).toLowerCase())) {
      alert('Email Invalid.');
      return;
    } else if (!phonere.test(String(this.editUserObj.phone_number).toLowerCase())) {
      alert('Phone Invalid.');
      return;
    } else if (this.editUserObj.username == "" || this.editUserObj.first_name == "" || this.editUserObj.last_name == "") {
      alert('Please fill all fields.');
      return;
    }

    if (this.editUserObj.id !== "") {
      console.log('SAve usre', user);
      console.log('editUserObje', this.editUserObj);
      this.apollo.mutate({
        mutation: UPDATE_USER,
        variables: {
          id: this.editUserObj.id,
          email: this.editUserObj.email,
          firstName: this.editUserObj.first_name,
          lastName: this.editUserObj.last_name,
          phoneNumber: this.editUserObj.phone_number,
          username: this.editUserObj.username,
        }
      }).subscribe(({ data }) => {
        this.editId = "";
      }, (error) => {
        console.log('there was an error sending the query', error);
      });
    }
    else {
      this.insertUser();
    }
  }

  deleteUser(id: string) {
    if (id === "") {
      this.users.shift();
    } else {
      this.apollo.mutate({
        mutation: DELETE_USERS,
        variables: {
          id: id
        }, // delete comment mutation
        refetchQueries: [{
          query: GET_USERS
        }]
      }).subscribe(({ data }) => {
        console.log('got data', data);
      }, (error) => {
        console.log('there was an error sending the query', error);
      });
    }
  }

  reshuffle() {
    let usedCards: number[] = [];

    for (let index = 0; index < this.users.length; index++) {
      let user = this.users[index];

      let hand: Card[] = this.getNewHand(usedCards);

      let newHand = hand[0].toStrCardValue + "," + hand[1].toStrCardValue;

      this.apollo.mutate({
        mutation: UPDATE_USER_CARD,
        variables: {
          cards: newHand, id: user.id
        }
      }).subscribe(({ data }) => {
      }, (error) => {
        console.log('there was an error sending the query', error);
      });
    }
  }

  getNewHand(usedCards: number[]) {
    let shuffleCard1: number = 0;


    let remaingCards: number[] = [];
    CARD_DECK.forEach((c, index) => {
      if (usedCards.indexOf(index) < 0) {
        remaingCards.push(index);
      }
    });
    shuffleCard1 = remaingCards[this.getRandomInt(0, remaingCards.length)];
    usedCards.push(shuffleCard1);

    let shuffleCard2: number = 0;
    remaingCards = [];
    CARD_DECK.forEach((c, index) => {
      if (usedCards.indexOf(index) < 0) {
        remaingCards.push(index);
      }
    });

    shuffleCard2 = remaingCards[this.getRandomInt(0, remaingCards.length)];
    usedCards.push(shuffleCard2);

    return this.sortHand(CARD_DECK[shuffleCard1] + "," + CARD_DECK[shuffleCard2]);
  }

  getCardObject(cardsVal: string) {
    let cards: Card[] = [];
    cardsVal.split(',').forEach(c => {
      let card: Card = new Card();
      card.suit = c[c.length - 1];
      card.value = c.substring(0, c.length - 1);
      cards.push(card);
    });
    return cards;
  }

  sortPlayerHands(users: any) {
    console.log('sortPlayerHands');
    let pairUsers: User[] = [];
    let straightFlushUsers: User[] = [];
    let flushUsers: User[] = [];
    let otherUsers: User[] = [];
    for (let index = 0; index < users.length; index++) {
      const user = users[index];
      let hand: Card[] = this.getCardObject(user.cards);
      if (this.isPair(hand)) {
        pairUsers.push(user);
      } else if (this.iStraightFlush(hand)) {
        straightFlushUsers.push(user);
      } else if (this.isFlush(hand)) {
        flushUsers.push(user);
      } else {
        otherUsers.push(user);
      }
    }
    pairUsers = this.sortPairUsers(pairUsers);
    straightFlushUsers = this.sortStraightFlushUsers(straightFlushUsers);
    flushUsers = this.sortFlushUsers(flushUsers);
    otherUsers = this.sortOtherUsers(otherUsers);
    console.log('pairUsers', pairUsers);
    console.log('straightFlushUsers', straightFlushUsers);
    console.log('flushUsers', flushUsers);
    console.log('otherUsers', otherUsers);
    this.users = [...pairUsers.concat(straightFlushUsers).concat(flushUsers).concat(otherUsers)];
    console.log('User Count', this.users.length);
  }

  iStraightFlush(hand: Card[]) {
    let card1Index = CARD_RANKS.findIndex(i => i === hand[0].value);
    let card2Index = CARD_RANKS.findIndex(i => i === hand[1].value);
    return (--card1Index === card2Index) && this.isFlush(hand);
  }

  isFlush(hand: Card[]) {
    return hand[0].suit === hand[1].suit;
  }

  isPair(hand: Card[]) {
    return hand[0].value === hand[1].value;
  }

  sortPairUsers(pairUsers: User[]) {
    let tempPairUsers: User[] = [];
    for (let index = CARD_RANKS.length - 1; index >= 0; index--) {
      const rank = CARD_RANKS[index];
      let rankUser = pairUsers.find(u => {
        let hand = this.getCardObject(u.cards)
        return hand && (rank == hand[0].value);
      });
      if (rankUser) {
        tempPairUsers.push(rankUser);
      }
    }
    return tempPairUsers;
  }

  sortStraightFlushUsers(straightFlushUsers: User[]) {
    let tempPairUsers: User[] = [];
    for (let index = CARD_RANKS.length - 1; index >= 0; index--) {
      const rank = CARD_RANKS[index];
      let rankUser = straightFlushUsers.find(u => {
        let hand = this.getCardObject(u.cards)
        return hand && (rank == hand[0].value);
      });
      if (rankUser) {
        tempPairUsers.push(rankUser);
      }
    }
    return tempPairUsers;
  }

  sortFlushUsers(flushUsers: User[]) {
    let tempPairUsers: User[] = [];
    for (let index = CARD_RANKS.length - 1; index >= 0; index--) {
      const rank = CARD_RANKS[index];
      let rankUser = flushUsers.find(u => {
        let hand = this.getCardObject(u.cards)
        return hand && (rank == hand[0].value);
      });
      if (rankUser) {
        tempPairUsers.push(rankUser);
      }
    }
    return tempPairUsers;
  }

  sortOtherUsers(otherUsers: User[]) {
    let tempOtherUsers: User[] = [];
    for (let index = CARD_RANKS.length - 1; index >= 0; index--) {
      const rank = CARD_RANKS[index];
      let rankUsers = otherUsers.filter(u => {
        let hand = this.getCardObject(u.cards)
        return hand && (rank == hand[0].value);
      });
      if (rankUsers) {
        tempOtherUsers = tempOtherUsers.concat(rankUsers);
      }
    }
    tempOtherUsers.sort((element_a: any, element_b: any) => {
      let card1Index = CARD_RANKS.findIndex(i => i === this.getCardObject(element_a.cards)[1].value);
      let card2Index = CARD_RANKS.findIndex(i => i === this.getCardObject(element_b.cards)[1].value);
      if (card1Index > card2Index)
        return -1;
      if (card1Index < card2Index)
        return 1;
      return 0;
    });

    return tempOtherUsers;
  }

  sortHand(cardsVal: string) {
    let hand: Card[] = this.getCardObject(cardsVal);

    let card1Index = CARD_RANKS.findIndex(i => i === hand[0].value);
    let card2Index = CARD_RANKS.findIndex(i => i === hand[1].value);
    if (card1Index > card2Index) {
      return [hand[0], hand[1]];
    }
    else {
      return [hand[1], hand[0]];
    }
  }

  getRandomInt(min: number, max: number) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min) + min); //The maximum is exclusive and the minimum is inclusive
  }

  ngOnDestroy(): void {
    this.querySubscription.unsubscribe();
  }
}

