import { buildTeacherRows } from "@/components/admin/UniqueTeachersPanel";

export const OFFLINE_REGIONS = ["KA", "TS", "AP", "Kerala", "North"] as const;
export type OfflineRegion = (typeof OFFLINE_REGIONS)[number];

export const REGION_LABELS: Record<OfflineRegion, string> = {
  KA: "Karnataka",
  TS: "Telangana",
  AP: "Andhra Pradesh",
  Kerala: "Kerala",
  North: "North",
};

export type OfflineMember = {
  id: string;
  name: string;
  region: OfflineRegion;
  url: string;
  destination: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string;
};

type RawMember = { name: string; region: OfflineRegion; url: string };

const RAW_MEMBERS: RawMember[] = [
  { name: "Mayur - KA", region: "KA", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=mayur_ka&utm_campaign=guru_ratna_2026&utm_content=Mayur+-+KA" },
  { name: "Praveen - KA", region: "KA", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=praveen_ka&utm_campaign=guru_ratna_2026&utm_content=Praveen+-+KA" },
  { name: "Shabresh - KA", region: "KA", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=shabresh_ka&utm_campaign=guru_ratna_2026&utm_content=Shabresh+-+KA" },
  { name: "Abhilash - KA", region: "KA", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=abhilash_ka&utm_campaign=guru_ratna_2026&utm_content=Abhilash+-+KA" },
  { name: "Harish - KA", region: "KA", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=harish_ka&utm_campaign=guru_ratna_2026&utm_content=Harish+-+KA" },
  { name: "Mahesh - KA", region: "KA", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=mahesh_ka&utm_campaign=guru_ratna_2026&utm_content=Mahesh+-+KA" },
  { name: "Ansar - KA", region: "KA", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=ansar_ka&utm_campaign=guru_ratna_2026&utm_content=Ansar+-+KA" },
  { name: "Raghu - KA", region: "KA", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=raghu_ka&utm_campaign=guru_ratna_2026&utm_content=Raghu+-+KA" },
  { name: "Ashwan - KA", region: "KA", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=ashwan_ka&utm_campaign=guru_ratna_2026&utm_content=Ashwan+-+KA" },
  { name: "Theertha Kumar - KA", region: "KA", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=theertha_kumar_ka&utm_campaign=guru_ratna_2026&utm_content=Theertha+Kumar+-+KA" },
  { name: "Dinesh - KA", region: "KA", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=dinesh_ka&utm_campaign=guru_ratna_2026&utm_content=Dinesh+-+KA" },
  { name: "Vignesh - KA", region: "KA", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=vignesh_ka&utm_campaign=guru_ratna_2026&utm_content=Vignesh+-+KA" },
  { name: "sinchana-kannada", region: "KA", url: "https://www.niatawards.in/nominate-student?utm_source=instagram&utm_medium=sinchana_kannada&utm_campaign=guru_ratna_2026&utm_content=sinchana-kannada" },
  { name: "KA", region: "KA", url: "https://www.niatawards.in/nominate-student?utm_source=whatsapp&utm_medium=ka&utm_campaign=guru_ratna_2026&utm_content=KA" },
  { name: "Indraeel Ingole - KA", region: "KA", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=indraeel_ingole_ka&utm_campaign=guru_ratna_2026&utm_content=Indraeel+Ingole+-+KA" },
  { name: "Akshay misal - KA", region: "KA", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=akshay_misal_ka&utm_campaign=guru_ratna_2026&utm_content=Akshay+misal+-+KA" },
  { name: "Swapnil Jadhav - KA", region: "KA", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=swapnil_jadhav_ka&utm_campaign=guru_ratna_2026&utm_content=Swapnil+Jadhav+-+KA" },
  { name: "Akshay yadav - KA", region: "KA", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=akshay_yadav_ka&utm_campaign=guru_ratna_2026&utm_content=Akshay+yadav+-+KA" },
  { name: "Soyal Ghudulal Shaikh - KA", region: "KA", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=soyal_ghudulal_shaikh_ka&utm_campaign=guru_ratna_2026&utm_content=Soyal+Ghudulal+Shaikh+-+KA" },
  { name: "Shubham Santosh Raut - KA", region: "KA", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=shubham_santosh_raut_ka&utm_campaign=guru_ratna_2026&utm_content=Shubham+Santosh+Raut+-+KA" },
  { name: "Ankur Akre - KA", region: "KA", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=ankur_akre_ka&utm_campaign=guru_ratna_2026&utm_content=Ankur+Akre+-+KA" },
  { name: "Sachin Kishor Gurav - KA", region: "KA", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=sachin_kishor_gurav_ka&utm_campaign=guru_ratna_2026&utm_content=Sachin+Kishor+Gurav+-+KA" },
  { name: "Sagar K Bhure Jain - KA", region: "KA", url: "https://www.niatawards.in/?utm_source=instagram&utm_medium=sagar_k_bhure_jain_ka&utm_campaign=guru_ratna_2026&utm_content=Sagar+K+Bhure+Jain+-+KA" },
  { name: "Sathishkumar K - Kerala", region: "Kerala", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=sathishkumar_k_kerala&utm_campaign=guru_ratna_2026&utm_content=Sathishkumar+K+-+Kerala" },
  { name: "Ajithkumar N - Kerala", region: "Kerala", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=ajithkumar_n_kerala&utm_campaign=guru_ratna_2026&utm_content=Ajithkumar+N+-+Kerala" },
  { name: "Girish Kumar - Kerala", region: "Kerala", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=girish_kumar_kerala&utm_campaign=guru_ratna_2026&utm_content=Girish+Kumar+-+Kerala" },
  { name: "Vignesh D - Kerala", region: "Kerala", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=vignesh_d_kerala&utm_campaign=guru_ratna_2026&utm_content=Vignesh+D+-+Kerala" },
  { name: "Ashik Bharath - Kerala", region: "Kerala", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=ashik_bharath_kerala&utm_campaign=guru_ratna_2026&utm_content=Ashik+Bharath+-+Kerala" },
  { name: "Balarajkumaran P - Kerala", region: "Kerala", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=balarajkumaran_p_kerala&utm_campaign=guru_ratna_2026&utm_content=Balarajkumaran+P+-+Kerala" },
  { name: "Anoop M S - Kerala", region: "Kerala", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=anoop_m_s_kerala&utm_campaign=guru_ratna_2026&utm_content=Anoop+M+S+-+Kerala" },
  { name: "Dharma k - Kerala", region: "Kerala", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=dharma_k_kerala&utm_campaign=guru_ratna_2026&utm_content=Dharma+k+-+Kerala" },
  { name: "Mathiyarasan M - Kerala", region: "Kerala", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=mathiyarasan_m_kerala&utm_campaign=guru_ratna_2026&utm_content=Mathiyarasan+M+-+Kerala" },
  { name: "Jijo Varghese - Kerala", region: "Kerala", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=jijo_varghese_kerala&utm_campaign=guru_ratna_2026&utm_content=Jijo+Varghese+-+Kerala" },
  { name: "Rethina Kumar C - Kerala", region: "Kerala", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=rethina_kumar_c_kerala&utm_campaign=guru_ratna_2026&utm_content=Rethina+Kumar+C+-+Kerala" },
  { name: "Siranjeeva C - Kerala", region: "Kerala", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=siranjeeva_c_kerala&utm_campaign=guru_ratna_2026&utm_content=Siranjeeva+C+-+Kerala" },
  { name: "Sreejish Mohana Kumar - Kerala", region: "Kerala", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=sreejish_mohana_kumar_kerala&utm_campaign=guru_ratna_2026&utm_content=Sreejish+Mohana+Kumar+-+Kerala" },
  { name: "Mohamed Deenul Ajlan - Kerala", region: "Kerala", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=mohamed_deenul_ajlan_kerala&utm_campaign=guru_ratna_2026&utm_content=Mohamed+Deenul+Ajlan+-+Kerala" },
  { name: "Rajagopal Vengatraman - Kerala", region: "Kerala", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=rajagopal_vengatraman_kerala&utm_campaign=guru_ratna_2026&utm_content=Rajagopal+Vengatraman+-+Kerala" },
  { name: "Muhammed Hijas - Kerala", region: "Kerala", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=muhammed_hijas_kerala&utm_campaign=guru_ratna_2026&utm_content=Muhammed+Hijas+-+Kerala" },
  { name: "Ajith Kumar S - Kerala", region: "Kerala", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=ajith_kumar_s_kerala&utm_campaign=guru_ratna_2026&utm_content=Ajith+Kumar+S+-+Kerala" },
  { name: "Narendran B - Kerala", region: "Kerala", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=narendran_b_kerala&utm_campaign=guru_ratna_2026&utm_content=Narendran+B+-+Kerala" },
  { name: "Johnwesly.G - Kerala", region: "Kerala", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=johnwesly_g_kerala&utm_campaign=guru_ratna_2026&utm_content=Johnwesly.G+-+Kerala" },
  { name: "Pittala Raju - TS", region: "TS", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=pittala_raju_ts&utm_campaign=guru_ratna_2026&utm_content=Pittala+Raju+-+TS" },
  { name: "Rajnikanth - TS", region: "TS", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=rajnikanth_ts&utm_campaign=guru_ratna_2026&utm_content=Rajnikanth+-+TS" },
  { name: "Chinni Nithin - TS", region: "TS", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=chinni_nithin_ts&utm_campaign=guru_ratna_2026&utm_content=Chinni+Nithin+-+TS" },
  { name: "Gummadi Chaitanya Tej - TS", region: "TS", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=gummadi_chaitanya_tej_ts&utm_campaign=guru_ratna_2026&utm_content=Gummadi+Chaitanya+Tej+-+TS" },
  { name: "Vallapu Reddy Ruthwik Reddy - TS", region: "TS", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=vallapu_reddy_ruthwik_reddy_ts&utm_campaign=guru_ratna_2026&utm_content=Vallapu+Reddy+Ruthwik+Reddy+-+TS" },
  { name: "Venkat Kalyan Kolluri - TS", region: "TS", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=venkat_kalyan_kolluri_ts&utm_campaign=guru_ratna_2026&utm_content=Venkat+Kalyan+Kolluri+-+TS" },
  { name: "Galla Shyam Kalyan - TS", region: "TS", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=galla_shyam_kalyan_ts&utm_campaign=guru_ratna_2026&utm_content=Galla+Shyam+Kalyan+-+TS" },
  { name: "Ravinder Jangili - TS", region: "TS", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=ravinder_jangili_ts&utm_campaign=guru_ratna_2026&utm_content=Ravinder+Jangili+-+TS" },
  { name: "Attili Veera Bhadra Swamy - TS", region: "TS", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=attili_veera_bhadra_swamy_ts&utm_campaign=guru_ratna_2026&utm_content=Attili+Veera+Bhadra+Swamy+-+TS" },
  { name: "Purella Akhil - TS", region: "TS", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=purella_akhil_ts&utm_campaign=guru_ratna_2026&utm_content=Purella+Akhil+-+TS" },
  { name: "Akutota Sanjay Kumar - TS", region: "TS", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=akutota_sanjay_kumar_ts&utm_campaign=guru_ratna_2026&utm_content=Akutota+Sanjay+Kumar+-+TS" },
  { name: "Gudala Sairam - AP", region: "AP", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=gudala_sairam_ap&utm_campaign=guru_ratna_2026&utm_content=Gudala+Sairam+-+AP" },
  { name: "Annepu Raj Kumar - AP", region: "AP", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=annepu_raj_kumar_ap&utm_campaign=guru_ratna_2026&utm_content=Annepu+Raj+Kumar+-+AP" },
  { name: "Kalivarapu Sandeep - AP", region: "AP", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=kalivarapu_sandeep_ap&utm_campaign=guru_ratna_2026&utm_content=Kalivarapu+Sandeep+-+AP" },
  { name: "Kandala Satvik - AP", region: "AP", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=kandala_satvik_ap&utm_campaign=guru_ratna_2026&utm_content=Kandala+Satvik+-+AP" },
  { name: "Chambuli Aditya Srinivas - AP", region: "AP", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=chambuli_aditya_srinivas_ap&utm_campaign=guru_ratna_2026&utm_content=Chambuli+Aditya+Srinivas+-+AP" },
  { name: "Madugula Nagaraju - AP", region: "AP", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=madugula_nagaraju_ap&utm_campaign=guru_ratna_2026&utm_content=Madugula+Nagaraju+-+AP" },
  { name: "Shaik Abdul - AP", region: "AP", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=shaik_abdul_ap&utm_campaign=guru_ratna_2026&utm_content=Shaik+Abdul+-+AP" },
  { name: "Santhosh Sripalasetti - AP", region: "AP", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=santhosh_sripalasetti_ap&utm_campaign=guru_ratna_2026&utm_content=Santhosh+Sripalasetti+-+AP" },
  { name: "Mohammad Imran - AP", region: "AP", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=mohammad_imran_ap&utm_campaign=guru_ratna_2026&utm_content=Mohammad+Imran+-+AP" },
  { name: "Pantrangam Vasu - AP", region: "AP", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=pantrangam_vasu_ap&utm_campaign=guru_ratna_2026&utm_content=Pantrangam+Vasu+-+AP" },
  { name: "Pakki Vinay - AP", region: "AP", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=pakki_vinay_ap&utm_campaign=guru_ratna_2026&utm_content=Pakki+Vinay+-+AP" },
  { name: "Mutluri Yohan - AP", region: "AP", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=mutluri_yohan_ap&utm_campaign=guru_ratna_2026&utm_content=Mutluri+Yohan+-+AP" },
  { name: "Anand Mishra - North", region: "North", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=anand_mishra_north&utm_campaign=guru_ratna_2026&utm_content=Anand+Mishra+-+North" },
  { name: "ROHIT RAJ SINHA - North", region: "North", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=rohit_raj_sinha_north&utm_campaign=guru_ratna_2026&utm_content=ROHIT+RAJ+SINHA+-+North" },
  { name: "Sidharth Tiwari - North", region: "North", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=sidharth_tiwari_north&utm_campaign=guru_ratna_2026&utm_content=Sidharth+Tiwari+-+North" },
  { name: "Saurav sinha - North", region: "North", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=saurav_sinha_north&utm_campaign=guru_ratna_2026&utm_content=Saurav+sinha+-+North" },
  { name: "Mohit Acharya - North", region: "North", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=mohit_acharya_north&utm_campaign=guru_ratna_2026&utm_content=Mohit+Acharya+-+North" },
  { name: "Ayush - North", region: "North", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=ayush_north&utm_campaign=guru_ratna_2026&utm_content=Ayush+-+North" },
  { name: "Aniket Sen - North", region: "North", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=aniket_sen_north&utm_campaign=guru_ratna_2026&utm_content=Aniket+Sen+-+North" },
  { name: "Hemraj Jangid - North", region: "North", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=hemraj_jangid_north&utm_campaign=guru_ratna_2026&utm_content=Hemraj+Jangid+-+North" },
  { name: "Janm Jay Kumar - North", region: "North", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=janm_jay_kumar_north&utm_campaign=guru_ratna_2026&utm_content=Janm+Jay+Kumar+-+North" },
  { name: "Harsh Jindal - North", region: "North", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=harsh_jindal_north&utm_campaign=guru_ratna_2026&utm_content=Harsh+Jindal+-+North" },
  { name: "Kunal Ganga - North", region: "North", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=kunal_ganga_north&utm_campaign=guru_ratna_2026&utm_content=Kunal+Ganga+-+North" },
  { name: "SIVA PRASAD GURU - North", region: "North", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=siva_prasad_guru_north&utm_campaign=guru_ratna_2026&utm_content=SIVA+PRASAD+GURU+-+North" },
  { name: "Aditya Tailor - North", region: "North", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=aditya_tailor_north&utm_campaign=guru_ratna_2026&utm_content=Aditya+Tailor+-+North" },
  { name: "Anuj soni - North", region: "North", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=anuj_soni_north&utm_campaign=guru_ratna_2026&utm_content=Anuj+soni+-+North" },
  { name: "Vaibhav Singh - North", region: "North", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=vaibhav_singh_north&utm_campaign=guru_ratna_2026&utm_content=Vaibhav+Singh+-+North" },
  { name: "Virendra Rajput - North", region: "North", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=virendra_rajput_north&utm_campaign=guru_ratna_2026&utm_content=Virendra+Rajput+-+North" },
  { name: "Deepak Rathor - North", region: "North", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=deepak_rathor_north&utm_campaign=guru_ratna_2026&utm_content=Deepak+Rathor+-+North" },
  { name: "Abdul Huda - North", region: "North", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=abdul_huda_north&utm_campaign=guru_ratna_2026&utm_content=Abdul+Huda+-+North" },
  { name: "Siddhant Kumar - North", region: "North", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=siddhant_kumar_north&utm_campaign=guru_ratna_2026&utm_content=Siddhant+Kumar+-+North" },
  { name: "Prince Hariharnath Sharma - North", region: "North", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=prince_hariharnath_sharma_north&utm_campaign=guru_ratna_2026&utm_content=Prince+Hariharnath+Sharma+-+North" },
  { name: "Sparsh Gupta - North", region: "North", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=sparsh_gupta_north&utm_campaign=guru_ratna_2026&utm_content=Sparsh+Gupta+-+North" },
  { name: "Nilesh Tiwari - North", region: "North", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=nilesh_tiwari_north&utm_campaign=guru_ratna_2026&utm_content=Nilesh+Tiwari+-+North" },
  { name: "Aryan Sharma - North", region: "North", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=aryan_sharma_north&utm_campaign=guru_ratna_2026&utm_content=Aryan+Sharma+-+North" },
  { name: "Rishik Jaiswal - North", region: "North", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=rishik_jaiswal_north&utm_campaign=guru_ratna_2026&utm_content=Rishik+Jaiswal+-+North" },
  { name: "Aakash Bhagtani - North", region: "North", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=aakash_bhagtani_north&utm_campaign=guru_ratna_2026&utm_content=Aakash+Bhagtani+-+North" },
  { name: "Bhanu Pratap Singh Sengar - North", region: "North", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=bhanu_pratap_singh_sengar_north&utm_campaign=guru_ratna_2026&utm_content=Bhanu+Pratap+Singh+Sengar+-+North" },
  { name: "Abhinav Pal - North", region: "North", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=abhinav_pal_north&utm_campaign=guru_ratna_2026&utm_content=Abhinav+Pal+-+North" },
  { name: "Badal Ranjan Rout - North", region: "North", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=badal_ranjan_rout_north&utm_campaign=guru_ratna_2026&utm_content=Badal+Ranjan+Rout+-+North" },
  { name: "Amlan Mishra - North", region: "North", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=amlan_mishra_north&utm_campaign=guru_ratna_2026&utm_content=Amlan+Mishra+-+North" },
  { name: "Sangram Haldar - North", region: "North", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=sangram_haldar_north&utm_campaign=guru_ratna_2026&utm_content=Sangram+Haldar+-+North" },
  { name: "Vaibhav Sharma - North", region: "North", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=vaibhav_sharma_north&utm_campaign=guru_ratna_2026&utm_content=Vaibhav+Sharma+-+North" },
  { name: "Sambit Kumar Aich - North", region: "North", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=sambit_kumar_aich_north&utm_campaign=guru_ratna_2026&utm_content=Sambit+Kumar+Aich+-+North" },
  { name: "Adarsh Anand Digal - North", region: "North", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=adarsh_anand_digal_north&utm_campaign=guru_ratna_2026&utm_content=Adarsh+Anand+Digal+-+North" },
  { name: "Akshay Kumar Pal - North", region: "North", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=akshay_kumar_pal_north&utm_campaign=guru_ratna_2026&utm_content=Akshay+Kumar+Pal+-+North" },
  { name: "Nithin - KA", region: "KA", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=nithin_ka&utm_campaign=guru_ratna_2026&utm_content=Nithin+-+KA" },
  { name: "Gurudarshan - KA", region: "KA", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=gurudarshan_ka&utm_campaign=guru_ratna_2026&utm_content=Gurudarshan+-+KA" },
  { name: "Ravi - KA", region: "KA", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=ravi_ka&utm_campaign=guru_ratna_2026&utm_content=Ravi+-+KA" },
  { name: "Ashwin - KA", region: "KA", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=ashwin_ka&utm_campaign=guru_ratna_2026&utm_content=Ashwin+-+KA" },
  { name: "Sai Vikas - KA", region: "KA", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=sai_vikas_ka&utm_campaign=guru_ratna_2026&utm_content=Sai+Vikas+-+KA" },
  { name: "Madhusudhan - KA", region: "KA", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=madhusudhan_ka&utm_campaign=guru_ratna_2026&utm_content=Madhusudhan+-+KA" },
  { name: "Naniverma - KA", region: "KA", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=naniverma_ka&utm_campaign=guru_ratna_2026&utm_content=Naniverma+-+KA" },
  { name: "Deekshith - KA", region: "KA", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=deekshith_ka&utm_campaign=guru_ratna_2026&utm_content=Deekshith+-+KA" },
  { name: "Akash - KA", region: "KA", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=akash_ka&utm_campaign=guru_ratna_2026&utm_content=Akash+-+KA" },
  { name: "Omkar - KA", region: "KA", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=omkar_ka&utm_campaign=guru_ratna_2026&utm_content=Omkar+-+KA" },
  { name: "AC KERALA", region: "Kerala", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=ac_kerala&utm_campaign=guru_ratna_2026&utm_content=AC+KERALA" },
  { name: "Ravindra ZM TS", region: "TS", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=ravindra_zm_ts&utm_campaign=guru_ratna_2026&utm_content=Ravindra+ZM+TS" },
  { name: "sreejesh Kerala ZM", region: "Kerala", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=sreejesh_kerala_zm&utm_campaign=guru_ratna_2026&utm_content=sreejesh+Kerala+ZM" },
  { name: "Santhosh KA ZM", region: "KA", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=santhosh_ka_zm&utm_campaign=guru_ratna_2026&utm_content=Santhosh+KA+ZM" },
  { name: "Sathya priya North ZM", region: "North", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=sathya_priya_north_zm&utm_campaign=guru_ratna_2026&utm_content=Sathya+priya+North+ZM" },
  { name: "Nagaraju AP ZM", region: "AP", url: "https://www.niatawards.in/?utm_source=whatsapp&utm_medium=nagaraju_ap_zm&utm_campaign=guru_ratna_2026&utm_content=Nagaraju+AP+ZM" },
  { name: "Nagaraju Zonal manager AP", region: "AP", url: "https://www.niatawards.in/nominate-student?utm_source=whatsapp&utm_medium=nagaraju_zonal_manager_ap&utm_campaign=guru_ratna_2026&utm_content=Nagaraju+Zonal+manager+AP" },
];

const slug = (value: unknown) => String(value ?? "").trim().toLowerCase();

const parseMember = (raw: RawMember): OfflineMember => {
  const parsed = new URL(raw.url);
  const utm_medium = slug(parsed.searchParams.get("utm_medium"));
  return {
    id: utm_medium,
    name: raw.name,
    region: raw.region,
    url: raw.url,
    destination: parsed.pathname || "/",
    utm_source: slug(parsed.searchParams.get("utm_source")),
    utm_medium,
    utm_campaign: slug(parsed.searchParams.get("utm_campaign")),
    utm_content: String(parsed.searchParams.get("utm_content") || "").trim(),
  };
};

export const OFFLINE_TEAM: OfflineMember[] = RAW_MEMBERS.map(parseMember);

const mediumIndex = new Map(OFFLINE_TEAM.map((member) => [member.utm_medium, member]));

export const memberForNomination = (n: { utm_medium?: string | null }): OfflineMember | undefined =>
  mediumIndex.get(slug(n?.utm_medium));

export type OfflineTeacher = ReturnType<typeof buildTeacherRows>[number];

export type OfflineMemberStats = OfflineMember & {
  nominations: any[];
  teachers: OfflineTeacher[];
};

export const scoreOfflineTeam = (nominations: any[]): OfflineMemberStats[] => {
  const buckets = new Map<string, any[]>();
  for (const n of nominations) {
    const member = memberForNomination(n);
    if (!member) continue;
    const list = buckets.get(member.id);
    if (list) list.push(n);
    else buckets.set(member.id, [n]);
  }
  return OFFLINE_TEAM.map((member) => {
    const list = buckets.get(member.id) || [];
    return { ...member, nominations: list, teachers: buildTeacherRows(list) };
  });
};

export const uniqueTeachersFrom = (rows: OfflineMemberStats[]) =>
  buildTeacherRows(rows.flatMap((row) => row.nominations));
